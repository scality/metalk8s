#!/usr/bin/env python3
"""Automates the upgrade of operator-sdk based projects.

Backs up operator/ and storage-operator/, scaffolds fresh projects with the
target SDK version, merges custom code from the backup, and verifies the build.

Usage:
    python3 scripts/upgrade-operator-sdk.py [OPTIONS]

Options:
    --operator-only    Only process the operator/ project
    --storage-only     Only process the storage-operator/ project
    --skip-backup      Skip the backup step (assumes .bak already exists)
    --clean-tools      Remove .tmp/bin/ after the upgrade (forces re-download next run)
    --yes, -y          Skip the confirmation prompt
    -h, --help         Show this help message

Environment variables:
    GITHUB_TOKEN       GitHub personal-access token; avoids the 60 req/hour
                       anonymous rate limit when querying the releases API.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Final, NoReturn

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
REPO_ROOT: Final = Path(__file__).resolve().parent.parent
TOOLS_BIN: Final = REPO_ROOT / ".tmp" / "bin"
_SDK_BIN: Final = TOOLS_BIN / "operator-sdk"

# All file I/O uses this encoding explicitly.
_ENCODING: Final = "utf-8"

# ---------------------------------------------------------------------------
# HTTP configuration
# ---------------------------------------------------------------------------

# Number of retry attempts for transient network errors.
_HTTP_RETRIES: Final = 3

# ---------------------------------------------------------------------------
# URLs
# ---------------------------------------------------------------------------

# Generic pattern for GitHub's latest-release API.
_GITHUB_RELEASES_URL: Final = "https://api.github.com/repos/{repo}/releases/latest"

_GITHUB_REPO_OPERATOR_SDK: Final = "operator-framework/operator-sdk"
_GITHUB_REPO_GOLANGCI_LINT: Final = "golangci/golangci-lint"

_URL_OPERATOR_SDK_GOMOD: Final = (
    "https://raw.githubusercontent.com/"
    + _GITHUB_REPO_OPERATOR_SDK
    + "/{version}/go.mod"
)
_URL_CONTROLLER_RUNTIME_GOMOD: Final = "https://raw.githubusercontent.com/kubernetes-sigs/controller-runtime/{version}/go.mod"
# Go module proxy — returns a newline-separated list of available versions.
_URL_GO_MODULE_VERSIONS: Final = "https://proxy.golang.org/{module}/@v/list"

_URL_OPERATOR_SDK_DOWNLOAD: Final = (
    "https://github.com/"
    + _GITHUB_REPO_OPERATOR_SDK
    + "/releases/download/{version}/operator-sdk_{goos}_{goarch}"
)
_URL_GO_RELEASES: Final = "https://go.dev/dl/?mode=json&include=all"

# k8s.io libraries that are always released in lock-step.
_K8S_LIBS: Final = ("k8s.io/api", "k8s.io/apimachinery", "k8s.io/client-go")
# The lib whose version drives the cadence for all three (queried for latest patch).
_K8S_LIB_MODULE: Final = _K8S_LIBS[0]

# ---------------------------------------------------------------------------
# Regex patterns
#
# Centralised here so the business logic functions stay free of raw string
# literals and a change in format only needs updating in one place.
# Patterns used inside file_regex_replace() embed flags (e.g. (?m)) because
# that helper does not accept a separate flags argument.
# ---------------------------------------------------------------------------

# Go version strings
_PAT_GO_MAJOR_MINOR: Final = r"^go(\d+\.\d+).*"
_PAT_SEMVER_MAJOR_MINOR: Final = r"(v\d+\.\d+)\."

# Dependency versions in go.mod files
_PAT_CONTROLLER_RUNTIME_IN_GOMOD: Final = r"sigs\.k8s\.io/controller-runtime\s+(v\S+)"
_PAT_K8S_API_IN_GOMOD: Final = r"k8s\.io/api\s+(v\S+)"

# Makefile lines (MULTILINE flag kept at call site for clarity)
_PAT_MAKEFILE_ENVTEST_LINE: Final = r"(^#?ENVTEST_K8S_VERSION[^\n]*\n)"
_PAT_MAKEFILE_GOLANGCI_VERSION: Final = r"^GOLANGCI_LINT_VERSION \?=.*$"

# Dockerfile patterns
_PAT_DOCKERFILE_FROM_GOLANG: Final = r"FROM golang:\d+\.\d+"
# Last COPY before the "# Build" section; used as insertion anchor for extra dirs.
# Matches any COPY line whose target starts with "internal" (the scaffold's last
# source COPY, regardless of whether it copies internal/ or internal/controller/).
_PAT_DOCKERFILE_LAST_SCAFFOLD_COPY: Final = r"(COPY internal\S* internal\S*\n)"

# operator-sdk PROJECT file ((?m) embedded because used in file_regex_replace)
_PAT_PROJECT_GROUP_LINE: Final = r"(?m)^  group: metalk8s\n"

# ---------------------------------------------------------------------------
# Makefile fragment templates
#
# __PLACEHOLDER__ tokens replace Python f-string escaping, which is especially
# confusing around the Jinja-style {{ }} delimiters used in the Makefile.
# ---------------------------------------------------------------------------

# Inserted after the ENVTEST_K8S_VERSION line in the generated Makefile.
_GOTOOLCHAIN_BLOCK: Final = (
    "\n"
    "# Force Go toolchain version to prevent automatic selection issues\n"
    "# See: https://go.dev/doc/toolchain\n"
    "export GOTOOLCHAIN = __TOOLCHAIN__\n"
)

# Appended to the Makefile; __IMAGE__ is replaced by spec.image_name at runtime.
# The outer {{ }} are Jinja2 delimiters — literal in the resulting Makefile.
_METALK8S_MAKE_TARGET: Final = (
    "\n"
    ".PHONY: metalk8s\n"
    "metalk8s: manifests kustomize ## Generate MetalK8s resulting manifests\n"
    "\tmkdir -p deploy\n"
    "\t$(KUSTOMIZE) build config/metalk8s | \\\n"
    "\tsed 's/BUILD_IMAGE_CLUSTER_OPERATOR:latest/"
    '{{ build_image_name("__IMAGE__") }}/\''
    " > deploy/manifests.yaml\n"
)

# ---------------------------------------------------------------------------
# Dockerfile fragment template
#
# Appended after ENTRYPOINT in the scaffold-generated Dockerfile.
# __NAME__, __DESCRIPTION__, and __TAGS__ are replaced at runtime.
# ---------------------------------------------------------------------------

_DOCKERFILE_LABEL_BLOCK: Final = (
    "\n"
    "# Timestamp of the build, formatted as RFC3339\n"
    "ARG BUILD_DATE\n"
    "# Git revision o the tree at build time\n"
    "ARG VCS_REF\n"
    "# Version of the image\n"
    "ARG VERSION\n"
    "# Version of the project, e.g. `git describe --always --long --dirty --broken`\n"
    "ARG METALK8S_VERSION\n"
    "\n"
    "# These contain BUILD_DATE so should come 'late' for layer caching\n"
    'LABEL maintainer="squad-metalk8s@scality.com" \\\n'
    "      # http://label-schema.org/rc1/\n"
    '      org.label-schema.build-date="$BUILD_DATE" \\\n'
    '      org.label-schema.name="__NAME__" \\\n'
    '      org.label-schema.description="__DESCRIPTION__" \\\n'
    '      org.label-schema.url="https://github.com/scality/metalk8s/" \\\n'
    '      org.label-schema.vcs-url="https://github.com/scality/metalk8s.git" \\\n'
    '      org.label-schema.vcs-ref="$VCS_REF" \\\n'
    '      org.label-schema.vendor="Scality" \\\n'
    '      org.label-schema.version="$VERSION" \\\n'
    '      org.label-schema.schema-version="1.0" \\\n'
    "      # https://github.com/opencontainers/image-spec/blob/master/annotations.md\n"
    '      org.opencontainers.image.created="$BUILD_DATE" \\\n'
    '      org.opencontainers.image.authors="squad-metalk8s@scality.com" \\\n'
    '      org.opencontainers.image.url="https://github.com/scality/metalk8s/" \\\n'
    "      org.opencontainers.image.source="
    '"https://github.com/scality/metalk8s.git" \\\n'
    '      org.opencontainers.image.version="$VERSION" \\\n'
    '      org.opencontainers.image.revision="$VCS_REF" \\\n'
    '      org.opencontainers.image.vendor="Scality" \\\n'
    '      org.opencontainers.image.title="__NAME__" \\\n'
    '      org.opencontainers.image.description="__DESCRIPTION__" \\\n'
    "      # https://docs.openshift.org/latest/creating_images/metadata.html\n"
    '      io.openshift.tags="__TAGS__" \\\n'
    '      io.k8s.description="__DESCRIPTION__" \\\n'
    "      # Various\n"
    '      com.scality.metalk8s.version="$METALK8S_VERSION"\n'
)

# ---------------------------------------------------------------------------
# Merge policy
#
# After scaffolding, every file from the backup is copied to the new project
# UNLESS it matches the scaffold-only rules below.  Custom code is therefore
# preserved automatically without maintaining an explicit restore list.
#
# Scaffold-only — keep new scaffold version, do NOT copy from backup:
#   Directories: .github  bin  cmd  config (except config/metalk8s/)
#   Root files:  .dockerignore  .gitignore  .golangci.yml  Dockerfile
#                go.mod  go.sum  Makefile  PROJECT  README.md
#   Generated:   *zz_generated*  internal/controller/suite_test.go
#
# NOTE: .devcontainer/ is removed explicitly by scaffold_project() and is
#       not listed here — it is gitignored and never present in backups.
# ---------------------------------------------------------------------------

_SCAFFOLD_ONLY_DIRS: Final[frozenset[str]] = frozenset(
    {
        ".github",
        "bin",
        "cmd",
        "config",
        # e2e test templates generated by operator-sdk (added in v1.42.x)
        "test",
    }
)

# Exact relative paths (root files + specific generated files).
_SCAFFOLD_ONLY_FILES: Final[frozenset[str]] = frozenset(
    {
        ".dockerignore",
        ".gitignore",
        ".golangci.yml",
        "Dockerfile",
        "go.mod",
        "go.sum",
        "Makefile",
        "PROJECT",
        "README.md",
        # scaffold-generated test setup (version-specific, not custom code)
        "internal/controller/suite_test.go",
    }
)

# All root-level entries expected from `operator-sdk init` + `create api`.
# If a fresh scaffold produces something outside this set, it may be a new
# scaffold addition that needs classifying in the sets above.
_KNOWN_SCAFFOLD_ROOTS: Final[frozenset[str]] = frozenset(
    _SCAFFOLD_ONLY_DIRS
    | {f.split("/")[0] for f in _SCAFFOLD_ONLY_FILES}
    | {
        ".devcontainer",  # removed by scaffold_project(), not in _SCAFFOLD_ONLY_DIRS
        "api",
        "hack",
        "internal",  # created by `create api`
    }
)


def _should_merge(rel: str) -> bool:
    """Return True if a backup file should be copied into the new project."""
    # config/metalk8s/ is our custom MetalK8s kustomize overlay.
    if rel.startswith("config/metalk8s/"):
        return True
    if "zz_generated" in rel:
        return False
    if rel in _SCAFFOLD_ONLY_FILES:
        return False
    return rel.split("/")[0] not in _SCAFFOLD_ONLY_DIRS


# ---------------------------------------------------------------------------
# Detected versions
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class VersionInfo:
    """Resolved tool versions, populated once by detect_versions()."""

    operator_sdk: str
    go_toolchain: str
    golangci_lint: str
    controller_runtime: str  # sigs.k8s.io/controller-runtime
    k8s_libs: str  # k8s.io/{api,apimachinery,client-go} — always in sync

    @property
    def go_major_minor(self) -> str:
        """Extract the Go major.minor from the toolchain string.

        Example: 'go1.24.13' -> '1.24'.
        """
        return re.sub(_PAT_GO_MAJOR_MINOR, r"\1", self.go_toolchain)


# Module-level reference; replaced by detect_versions() before any phase runs.
# Sentinel values make it obvious if versions is accidentally read early.
_UNSET = "<unset>"
versions: VersionInfo = VersionInfo(
    operator_sdk=_UNSET,
    go_toolchain=_UNSET,
    golangci_lint=_UNSET,
    controller_runtime=_UNSET,
    k8s_libs=_UNSET,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
_GREEN: Final = "\033[32m"
_YELLOW: Final = "\033[33m"
_RED: Final = "\033[31m"
_BLUE_BOLD: Final = "\033[1;34m"
_BOLD: Final = "\033[1m"
_RESET: Final = "\033[0m"


def log_info(msg: str) -> None:
    print(f"{_GREEN}[INFO]{_RESET}  {msg}")


def log_warn(msg: str) -> None:
    print(f"{_YELLOW}[WARN]{_RESET}  {msg}", file=sys.stderr)


def log_error(msg: str) -> None:
    print(f"{_RED}[ERROR]{_RESET} {msg}", file=sys.stderr)


def log_step(msg: str) -> None:
    print(f"\n{_BLUE_BOLD}==>{_RESET} {_BOLD}{msg}{_RESET}")


def die(msg: str) -> NoReturn:
    log_error(msg)
    sys.exit(1)


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------


def _github_headers() -> dict[str, str]:
    """Return HTTP headers for GitHub API requests.

    Includes ``Authorization`` when ``GITHUB_TOKEN`` is set, raising the rate
    limit from 60 to 5000 requests per hour.
    """
    headers: dict[str, str] = {}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
        log_info("Using GITHUB_TOKEN for authenticated GitHub API requests")
    return headers


def _http_get(url: str, *, headers: dict[str, str] | None = None) -> bytes:
    """GET *url*, retrying up to *_HTTP_RETRIES* times on transient errors.

    HTTP errors (4xx/5xx) are not retried — they fail immediately.
    Transient ``URLError`` (timeouts, DNS failures) use exponential backoff.
    """
    req = urllib.request.Request(url, headers=headers or {})
    for attempt in range(_HTTP_RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data: bytes = resp.read()
                return data
        except urllib.error.HTTPError:
            raise  # not transient
        except urllib.error.URLError as exc:
            if attempt < _HTTP_RETRIES - 1:
                delay = 2 ** (attempt + 1)
                log_warn(f"Request failed ({exc.reason}), retrying in {delay}s…")
                time.sleep(delay)
            else:
                raise
    raise RuntimeError("_http_get: unreachable")  # satisfy static analysis


def _fetch_json(url: str, *, headers: dict[str, str] | None = None) -> Any:
    try:
        return json.loads(_http_get(url, headers=headers))
    except urllib.error.HTTPError as e:
        die(f"HTTP {e.code} for {url}")
    except urllib.error.URLError as e:
        die(f"Failed to fetch {url}: {e.reason}")


def _fetch_text(url: str, *, headers: dict[str, str] | None = None) -> str:
    try:
        return _http_get(url, headers=headers).decode(_ENCODING)
    except urllib.error.HTTPError as e:
        die(f"HTTP {e.code} for {url}")
    except urllib.error.URLError as e:
        die(f"Failed to fetch {url}: {e.reason}")


def _fetch_latest_github_release(repo: str) -> str:
    """Return the latest release tag for a GitHub repository (e.g. 'owner/repo').

    Respects ``GITHUB_TOKEN`` to avoid the anonymous rate limit.
    """
    data = _fetch_json(
        _GITHUB_RELEASES_URL.format(repo=repo),
        headers=_github_headers(),
    )
    return str(data["tag_name"])


# ---------------------------------------------------------------------------
# Version detection
#
# Resolution chain:
#   1. operator-sdk       <- GitHub releases/latest
#   2. Go major.minor     <- operator-sdk's go.mod at that tag (fetched once)
#   3. Go toolchain       <- latest stable patch from go.dev for that minor
#   4. controller-runtime <- operator-sdk's go.mod (same fetch)
#   5. k8s.io libs        <- controller-runtime's go.mod at that tag
#   6. golangci-lint       <- GitHub releases/latest
# ---------------------------------------------------------------------------


def _detect_operator_sdk_version() -> str:
    log_info("Querying GitHub for latest operator-sdk release...")
    ver = _fetch_latest_github_release(_GITHUB_REPO_OPERATOR_SDK)
    log_info(f"  operator-sdk:       {ver}")
    return ver


def _detect_go_toolchain_from_gomod(gomod: str) -> str:
    """Return the latest stable Go patch for the minor declared in *gomod* content."""
    m = re.search(r"^go\s+(\d+\.\d+)(?:\.\d+)?", gomod, re.MULTILINE)
    if not m:
        die("Failed to parse Go version from go.mod")
    # m.group(0) is e.g. "go 1.24.6"; m.group(1) is the major.minor "1.24"
    go_version = m.group(0).split()[1]
    go_major_minor = m.group(1)
    log_info(f"  operator-sdk targets Go {go_version} (minor: {go_major_minor})")

    log_info(f"Querying go.dev for latest Go {go_major_minor}.x patch...")
    releases = _fetch_json(_URL_GO_RELEASES)
    prefix = f"go{go_major_minor}."
    toolchain = next(
        (
            r["version"]
            for r in releases
            if r["version"].startswith(prefix) and r.get("stable")
        ),
        f"go{go_major_minor}.0",
    )
    log_info(f"  Go toolchain:       {toolchain}")
    return toolchain


def _latest_k8s_patch(base_version: str) -> str:
    """Return the latest stable patch for the k8s.io major.minor of *base_version*.

    Queries the Go module proxy for ``k8s.io/api`` — which drives the patch
    cadence for all three libs — and returns the highest patch in the same
    major.minor series.  Falls back to *base_version* on any parse error.
    """
    m = re.match(_PAT_SEMVER_MAJOR_MINOR, base_version)
    if not m:
        return base_version
    prefix = m.group(1) + "."

    url = _URL_GO_MODULE_VERSIONS.format(module=_K8S_LIB_MODULE)
    log_info(f"Querying Go module proxy for latest k8s.io {m.group(1)}.x patch...")
    content = _fetch_text(url)

    candidates = [
        v.strip()
        for v in content.splitlines()
        # Only stable releases of the right minor; skip pre-releases (contain "-")
        if v.strip().startswith(prefix) and "-" not in v.strip()
    ]
    if not candidates:
        return base_version

    def _patch(v: str) -> int:
        try:
            return int(v.rsplit(".", 1)[-1])
        except ValueError:
            return -1

    latest = max(candidates, key=_patch)
    log_info(f"  k8s.io libs:        {latest}")
    return latest


def _detect_controller_runtime_and_k8s(sdk_gomod: str) -> tuple[str, str]:
    """Return (controller_runtime_version, k8s_libs_latest_patch).

    Both versions are derived from the operator-sdk go.mod content.
    The k8s.io version is bumped to the latest compatible patch via the
    Go module proxy (k8s.io/api, apimachinery and client-go are in lock-step).
    """
    # controller-runtime version is declared in operator-sdk's own go.mod.
    m_cr = re.search(_PAT_CONTROLLER_RUNTIME_IN_GOMOD, sdk_gomod)
    if not m_cr:
        die("Failed to parse controller-runtime version from operator-sdk go.mod")
    cr_version = m_cr.group(1)
    log_info(f"  controller-runtime: {cr_version}")

    # The minimum compatible k8s.io/api version comes from controller-runtime.
    log_info("Querying controller-runtime go.mod for k8s.io base version...")
    cr_gomod = _fetch_text(_URL_CONTROLLER_RUNTIME_GOMOD.format(version=cr_version))
    m_k8s = re.search(_PAT_K8S_API_IN_GOMOD, cr_gomod)
    if not m_k8s:
        die("Failed to parse k8s.io/api version from controller-runtime go.mod")
    base_k8s = m_k8s.group(1)

    # Bump to the latest patch of that major.minor.
    k8s_version = _latest_k8s_patch(base_k8s)

    return cr_version, k8s_version


def _detect_golangci_lint_version() -> str:
    log_info("Querying GitHub for latest golangci-lint release...")
    ver = _fetch_latest_github_release(_GITHUB_REPO_GOLANGCI_LINT)
    log_info(f"  golangci-lint:      {ver}")
    return ver


def detect_versions() -> VersionInfo:
    """Fetch the latest compatible versions from public APIs and return them."""
    log_step("Detecting latest compatible versions")
    sdk = _detect_operator_sdk_version()

    # Fetch operator-sdk's go.mod once; reuse content for Go toolchain and
    # controller-runtime detection to avoid redundant network requests.
    log_info("Querying operator-sdk go.mod...")
    sdk_gomod = _fetch_text(_URL_OPERATOR_SDK_GOMOD.format(version=sdk))

    go_toolchain = _detect_go_toolchain_from_gomod(sdk_gomod)
    cr_version, k8s_version = _detect_controller_runtime_and_k8s(sdk_gomod)

    return VersionInfo(
        operator_sdk=sdk,
        go_toolchain=go_toolchain,
        golangci_lint=_detect_golangci_lint_version(),
        controller_runtime=cr_version,
        k8s_libs=k8s_version,
    )


def confirm_versions(targets: list[str]) -> None:
    """Print the resolved versions and ask the user to confirm before proceeding."""
    print()
    print(f"{_BOLD}The following upgrade will be performed:{_RESET}")
    print()
    print(f"  operator-sdk        {versions.operator_sdk}")
    print(f"  controller-runtime  {versions.controller_runtime}")
    print(f"  k8s.io libs         {versions.k8s_libs}  (api, apimachinery, client-go)")
    print(f"  Go toolchain        {versions.go_toolchain}")
    print(f"  golangci-lint       {versions.golangci_lint}")
    print()
    print(f"  Targets:        {' '.join(targets)}")
    print(f"  Repository:     {REPO_ROOT}")
    print()
    answer = input(f"{_BOLD}Proceed? [y/N] {_RESET}").strip().lower()
    if answer not in ("y", "yes"):
        log_info("Aborted by user.")
        sys.exit(0)


# ---------------------------------------------------------------------------
# Process execution
# ---------------------------------------------------------------------------


def _tool_env() -> dict[str, str]:
    """Return environment overrides that put our tools first in PATH.

    Raises ``RuntimeError`` if called before ``detect_versions()``, making
    the implicit dependency on the ``versions`` singleton explicit and loud.
    """
    if versions.go_toolchain == _UNSET:
        raise RuntimeError("versions not initialised — call detect_versions() first")
    return {
        "PATH": f"{TOOLS_BIN}:{os.environ.get('PATH', '')}",
        "GOTOOLCHAIN": versions.go_toolchain,
    }


def run(
    cmd: list[str],
    *,
    cwd: Path | None = None,
    check: bool = True,
    capture: bool = False,
) -> subprocess.CompletedProcess[Any]:
    """Run a command list, inheriting stdout/stderr unless *capture* is set."""
    merged_env = {**os.environ, **_tool_env()}
    kwargs: dict[str, Any] = {"cwd": cwd, "env": merged_env}
    if capture:
        kwargs["capture_output"] = True
        kwargs["text"] = True
    return subprocess.run(cmd, check=check, **kwargs)


# ---------------------------------------------------------------------------
# File helpers
# ---------------------------------------------------------------------------


def file_regex_replace(path: Path, pattern: str, repl: str) -> None:
    path.write_text(
        re.sub(pattern, repl, path.read_text(encoding=_ENCODING)), encoding=_ENCODING
    )


# ---------------------------------------------------------------------------
# Operator descriptor
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class DockerfilePatch:
    """Customizations applied on top of the scaffold-generated Dockerfile.

    The scaffold Dockerfile is kept as the base; these fields describe the
    MetalK8s-specific additions (extra COPY layers, ldflags, OCI labels).
    """

    extra_copy_dirs: tuple[str, ...]
    ldflags: str
    label_description: str
    openshift_tags: str


@dataclass(frozen=True)
class SourceFix:
    """A text replacement applied to a source file after merge.

    Fixes are idempotent: if *old* is not found, the file is left unchanged.
    Each fix should carry a comment in OPERATORS explaining its context and
    indicating when it can safely be removed.
    """

    path: str  # relative path from the operator root
    old: str  # literal string to replace (or regex pattern when regex=True)
    new: str  # replacement value
    regex: bool = False


@dataclass(frozen=True)
class ApiDef:
    """Describes a single CRD/API to scaffold."""

    group: str
    version: str
    kind: str


@dataclass(frozen=True)
class OperatorSpec:
    """Static configuration for one operator project.

    Add entries to *fixes* for any source-level corrections that need to be
    applied after merging the backup.  They are idempotent, so stale entries
    are safe (they become no-ops), but should be removed to keep the file clean.
    """

    name: str
    repo: str
    apis: tuple[ApiDef, ...]
    image_name: str = ""
    dockerfile: DockerfilePatch = DockerfilePatch((), "", "", "")
    fixes: tuple[SourceFix, ...] = ()

    @property
    def op_dir(self) -> Path:
        """Absolute path to this operator's project directory."""
        return REPO_ROOT / self.name

    @property
    def bak_dir(self) -> Path:
        """Absolute path to this operator's backup directory."""
        return REPO_ROOT / f"{self.name}.bak"


OPERATORS: Final[dict[str, OperatorSpec]] = {
    "operator": OperatorSpec(
        name="operator",
        repo="github.com/scality/metalk8s/operator",
        apis=(
            ApiDef("", "v1alpha1", "ClusterConfig"),
            ApiDef("", "v1alpha1", "VirtualIPPool"),
        ),
        image_name="metalk8s-operator",
        dockerfile=DockerfilePatch(
            extra_copy_dirs=("pkg/", "version/"),
            ldflags="-X 'github.com/scality/metalk8s/operator/"
            "version.Version=${METALK8S_VERSION}'",
            label_description="Kubernetes Operator for managing "
            "MetalK8s cluster config",
            openshift_tags="metalk8s,operator",
        ),
        fixes=(
            # Go 1.24+: go vet rejects non-constant format strings in fmt.Errorf.
            # Remove once the backup no longer contains this pattern
            # (i.e., after this script has run at least once from v1.37.0).
            SourceFix(
                path="pkg/controller/clusterconfig/controlplane/ingress.go",
                old=r"fmt\.Errorf\(([a-zA-Z_]\w*)\)",
                new=r'fmt.Errorf("%s", \1)',
                regex=True,
            ),
        ),
    ),
    "storage-operator": OperatorSpec(
        name="storage-operator",
        repo="github.com/scality/metalk8s/storage-operator",
        apis=(ApiDef("storage", "v1alpha1", "Volume"),),
        image_name="storage-operator",
        dockerfile=DockerfilePatch(
            extra_copy_dirs=("salt/",),
            ldflags="",
            label_description="Kubernetes Operator for managing "
            "PersistentVolumes in MetalK8s",
            openshift_tags="metalk8s,storage,operator",
        ),
        fixes=(
            # Go 1.16: io/ioutil deprecated.
            # Remove once the backup no longer imports io/ioutil
            # (i.e., after this script has run at least once from v1.37.0).
            SourceFix(
                path="internal/controller/volume_controller.go",
                old='"io/ioutil"',
                new='"os"',
            ),
            SourceFix(
                path="internal/controller/volume_controller.go",
                old="ioutil.ReadFile",
                new="os.ReadFile",
            ),
        ),
    ),
}

# Validate that every dict key matches the embedded spec.name.
assert all(
    k == v.name for k, v in OPERATORS.items()
), "OPERATORS key must match spec.name"


# ===================================================================
# Phase 0 — Install tools
# ===================================================================


def _check_prerequisites() -> None:
    """Fail early with a clear message if required system tools are missing."""
    missing = [tool for tool in ("go", "curl") if shutil.which(tool) is None]
    if missing:
        die(f"Required tools not found in PATH: {', '.join(missing)}")


def _is_installed(bin_path: Path, version: str) -> bool:
    """Return True if *bin_path* exists and reports *version* in its output."""
    if not bin_path.exists():
        return False
    result = run([str(bin_path), "version"], capture=True, check=False)
    return version.lstrip("v") in result.stdout


def install_operator_sdk() -> None:
    log_step(f"Installing operator-sdk {versions.operator_sdk}")
    TOOLS_BIN.mkdir(parents=True, exist_ok=True)

    if _is_installed(_SDK_BIN, versions.operator_sdk):
        log_info("Already installed")
        return

    goos = run(["go", "env", "GOOS"], capture=True).stdout.strip()
    goarch = run(["go", "env", "GOARCH"], capture=True).stdout.strip()
    url = _URL_OPERATOR_SDK_DOWNLOAD.format(
        version=versions.operator_sdk, goos=goos, goarch=goarch
    )
    log_info(f"Downloading for {goos}/{goarch}...")
    run(["curl", "-sSLo", str(_SDK_BIN), url])
    _SDK_BIN.chmod(0o755)
    ver = run([str(_SDK_BIN), "version"], capture=True).stdout.strip().split("\n")[0]
    log_info(f"Installed: {ver}")


# ===================================================================
# Phase 1 — Backup
# ===================================================================


def backup_operator(spec: OperatorSpec) -> None:
    log_step(f"Phase 1: Backing up {spec.name}")
    op_dir = spec.op_dir
    bak = spec.bak_dir

    if bak.exists():
        log_warn(f"Removing existing backup {bak}")
        shutil.rmtree(bak)
    if not op_dir.exists():
        die(f"{op_dir} does not exist")

    op_dir.rename(bak)
    log_info(f"{op_dir} -> {bak}")


# ===================================================================
# Phase 2 — Scaffold fresh project
# ===================================================================


def scaffold_project(spec: OperatorSpec) -> None:
    log_step(f"Phase 2: Scaffolding {spec.name}")
    op_dir = spec.op_dir
    sdk = str(_SDK_BIN)

    op_dir.mkdir(parents=True, exist_ok=True)

    run(
        [
            sdk,
            "init",
            "--domain",
            "metalk8s.scality.com",
            "--repo",
            spec.repo,
            "--project-name",
            spec.name,
        ],
        cwd=op_dir,
    )

    for api in spec.apis:
        _create_api(op_dir, sdk, api)

    # Remove scaffold additions we don't want in the project.
    devcontainer = op_dir / ".devcontainer"
    if devcontainer.exists():
        shutil.rmtree(devcontainer)
        log_info("Removed .devcontainer/ (not needed)")

    # Warn about any scaffold-generated root entries not yet in our policy.
    _check_scaffold_completeness(op_dir)

    log_info("Scaffold complete")


def _create_api(op_dir: Path, sdk: str, api: ApiDef) -> None:
    # Build the common trailing arguments once to avoid duplication.
    tail = ["--version", api.version, "--kind", api.kind, "--resource", "--controller"]

    result = run(
        [sdk, "create", "api", "--group", api.group, *tail], cwd=op_dir, check=False
    )
    if result.returncode == 0:
        log_info(f"Created {api.kind} API (group={api.group!r})")
        return

    if api.group:
        die(f"Failed to create API {api.kind}")

    # operator-sdk may reject an empty group; retry with a placeholder and then
    # scrub it from PROJECT so the CRD group stays empty.
    log_warn(f"Empty group rejected for {api.kind}, retrying with placeholder")
    run([sdk, "create", "api", "--group", "metalk8s", *tail], cwd=op_dir)
    file_regex_replace(op_dir / "PROJECT", _PAT_PROJECT_GROUP_LINE, "")
    log_info("Patched PROJECT: removed placeholder group")


def _check_scaffold_completeness(op_dir: Path) -> None:
    """Warn about scaffold root entries not yet classified in the merge policy.

    When operator-sdk adds new root-level directories or files, they may be
    silently merged from backup (or silently dropped).  This check flags them
    so a maintainer can update ``_SCAFFOLD_ONLY_DIRS`` or
    ``_SCAFFOLD_ONLY_FILES`` accordingly.
    """
    for entry in sorted(op_dir.iterdir()):
        if entry.name not in _KNOWN_SCAFFOLD_ROOTS:
            log_warn(
                f"Unclassified scaffold entry: {entry.name!r} — "
                "add to _SCAFFOLD_ONLY_DIRS or _SCAFFOLD_ONLY_FILES "
                "if scaffold-generated"
            )


# ===================================================================
# Phase 3 — Merge custom code from backup
# ===================================================================


def merge_backup(spec: OperatorSpec) -> None:
    log_step(f"Phase 3: Merging custom code for {spec.name}")
    op_dir = spec.op_dir
    bak = spec.bak_dir

    merged: list[str] = []
    for src in sorted(bak.rglob("*")):
        if not src.is_file():
            continue
        rel = src.relative_to(bak).as_posix()
        if not _should_merge(rel):
            continue
        dst = op_dir / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        # shutil.copy (not copy2): gives merged files current timestamps so
        # that make does not mistake them for stale relative to generated artefacts.
        shutil.copy(src, dst)
        log_info(f"  {rel}")
        merged.append(rel)

    log_info(f"Custom code merged: {len(merged)} file(s)")


# ===================================================================
# Phase 4 — Adapt and fix
# ===================================================================


def adapt_project(spec: OperatorSpec) -> None:
    """Apply all post-merge adaptations."""
    _adapt_makefile(spec)
    _adapt_dockerfile(spec)
    _apply_source_fixes(spec)
    _remove_incompatible_scaffold_tests(spec.op_dir)


def _adapt_makefile(spec: OperatorSpec) -> None:
    log_info("Adapting Makefile...")
    makefile = spec.op_dir / "Makefile"
    text = makefile.read_text(encoding=_ENCODING)

    if "export GOTOOLCHAIN" not in text:
        gotoolchain_block = _GOTOOLCHAIN_BLOCK.replace(
            "__TOOLCHAIN__", versions.go_toolchain
        )
        new_text, count = re.subn(
            _PAT_MAKEFILE_ENVTEST_LINE,
            rf"\1{gotoolchain_block}",
            text,
            count=1,
            flags=re.MULTILINE,
        )
        if count == 0:
            # The scaffold template may change; fall back to appending.
            log_warn(
                "ENVTEST_K8S_VERSION not found in Makefile; "
                "appending GOTOOLCHAIN block at end"
            )
            text += gotoolchain_block
        else:
            text = new_text

    text = re.sub(
        _PAT_MAKEFILE_GOLANGCI_VERSION,
        f"GOLANGCI_LINT_VERSION ?= {versions.golangci_lint}",
        text,
        flags=re.MULTILINE,
    )

    # Guard against appending twice when --skip-backup is used on an
    # already-upgraded project.
    if ".PHONY: metalk8s" not in text:
        text += _METALK8S_MAKE_TARGET.replace("__IMAGE__", spec.image_name)

    makefile.write_text(text, encoding=_ENCODING)
    log_info("Makefile adapted")


def _adapt_dockerfile(spec: OperatorSpec) -> None:
    """Apply MetalK8s customizations on top of the scaffold-generated Dockerfile."""
    log_info("Adapting Dockerfile...")
    df = spec.op_dir / "Dockerfile"
    text = df.read_text(encoding=_ENCODING)
    patch = spec.dockerfile

    text = re.sub(
        _PAT_DOCKERFILE_FROM_GOLANG,
        f"FROM golang:{versions.go_major_minor}",
        text,
    )

    if patch.extra_copy_dirs:
        copies = "".join(f"COPY {d} {d}\n" for d in patch.extra_copy_dirs)
        text = re.sub(_PAT_DOCKERFILE_LAST_SCAFFOLD_COPY, rf"\g<1>{copies}", text)

    if patch.ldflags:
        text = text.replace(
            "\n# Build\n",
            "\n# Version of the project, e.g. "
            "`git describe --always --long --dirty --broken`\n"
            "ARG METALK8S_VERSION\n"
            "\n# Build\n",
        )
        text = text.replace(
            "go build -a -o manager cmd/main.go",
            "go build -a -o manager \\\n"
            f'      -ldflags "{patch.ldflags}" \\\n'
            "      cmd/main.go",
        )

    label = (
        _DOCKERFILE_LABEL_BLOCK.replace("__NAME__", spec.image_name)
        .replace("__DESCRIPTION__", patch.label_description)
        .replace("__TAGS__", patch.openshift_tags)
    )
    text += label

    df.write_text(text, encoding=_ENCODING)
    log_info("Dockerfile adapted")


def _apply_source_fix(op_dir: Path, fix: SourceFix) -> None:
    """Apply a single SourceFix; writes the file only if content changed."""
    path = op_dir / fix.path
    if not path.exists():
        return
    text = path.read_text(encoding=_ENCODING)
    updated = (
        re.sub(fix.old, fix.new, text) if fix.regex else text.replace(fix.old, fix.new)
    )
    if updated != text:
        log_info(f"Applied fix: {Path(fix.path).name}")
        path.write_text(updated, encoding=_ENCODING)


def _apply_source_fixes(spec: OperatorSpec) -> None:
    """Apply the operator-specific source fixes declared in spec.fixes."""
    for fix in spec.fixes:
        _apply_source_fix(spec.op_dir, fix)


def _remove_incompatible_scaffold_tests(op_dir: Path) -> None:
    """Remove scaffold controller tests incompatible with our delegation pattern.

    operator-sdk generates *_controller_test.go stubs that call .Reconcile()
    directly on the reconciler struct.  Our controllers use a delegation pattern
    where the inner struct registered with the manager does not expose Reconcile(),
    so these stubs must be removed.  This applies to every operator-sdk upgrade.
    """
    ctrl_dir = op_dir / "internal" / "controller"
    if not ctrl_dir.exists():
        return
    for test_file in ctrl_dir.glob("*_controller_test.go"):
        if ".Reconcile(" in test_file.read_text(encoding=_ENCODING):
            log_info(f"Removing incompatible scaffold test: {test_file.name}")
            test_file.unlink()


# ===================================================================
# Phase 5 — Generate and build
# ===================================================================


def generate_and_build(spec: OperatorSpec) -> None:
    log_step(f"Phase 5: Generate & build {spec.name}")
    op_dir = spec.op_dir
    bin_dir = op_dir / "bin"
    if bin_dir.exists():
        shutil.rmtree(bin_dir)

    # Explicitly pin k8s.io libs to the latest compatible patch before tidy,
    # so `go mod tidy` does not silently keep an older patch from the scaffold.
    k8s_get_args = [f"{lib}@{versions.k8s_libs}" for lib in _K8S_LIBS]
    log_info(f"Bumping k8s.io libs to {versions.k8s_libs}...")
    run(["go", "get", *k8s_get_args], cwd=op_dir)

    steps = [
        ("go mod tidy...", ["go", "mod", "tidy"]),
        ("make manifests generate...", ["make", "manifests", "generate"]),
        ("make fmt vet...", ["make", "fmt", "vet"]),
        ("make build...", ["make", "build"]),
        ("make metalk8s...", ["make", "metalk8s"]),
    ]
    for msg, cmd in steps:
        log_info(msg)
        run(cmd, cwd=op_dir)

    log_info(f"Build succeeded for {spec.name}")


# ===================================================================
# Cleanup
# ===================================================================


def _clean_tools() -> None:
    """Remove the script's tool cache (.tmp/bin/).

    This forces operator-sdk to be re-downloaded on the next run, which is
    useful to reclaim disk space after the upgrade.  The operator bin/
    directories created during scaffolding are not affected; they are
    controlled by each operator's Makefile.
    """
    if TOOLS_BIN.exists():
        log_step(f"Cleaning tool cache ({TOOLS_BIN.relative_to(REPO_ROOT)}/)")
        shutil.rmtree(TOOLS_BIN)
        log_info(f"Removed {TOOLS_BIN}")
    else:
        log_info("Tool cache already empty")


# ===================================================================
# Recovery
# ===================================================================


def _log_recovery_hint(name: str) -> None:
    """Log recovery instructions after an interrupted or failed upgrade."""
    op_dir = REPO_ROOT / name
    bak = REPO_ROOT / f"{name}.bak"
    log_error(f"Processing of '{name}' was interrupted or failed")
    if bak.exists():
        log_warn(f"Backup preserved at: {bak}")
    if op_dir.exists() and bak.exists():
        log_warn("Partial build detected. To restore the original state:")
        log_warn(f"  rm -rf {op_dir} && mv {bak} {op_dir}")
    elif bak.exists():
        log_warn(f"To restore: mv {bak} {op_dir}")


# ===================================================================
# Main
# ===================================================================


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Upgrade operator-sdk projects by scaffolding fresh and "
        "merging custom code from backup.",
    )
    parser.add_argument(
        "--operator-only", action="store_true", help="Only process operator/"
    )
    parser.add_argument(
        "--storage-only", action="store_true", help="Only process storage-operator/"
    )
    parser.add_argument(
        "--skip-backup", action="store_true", help="Skip backup (assumes .bak exists)"
    )
    parser.add_argument(
        "--clean-tools",
        action="store_true",
        help=f"Remove {TOOLS_BIN.relative_to(REPO_ROOT)}/ after upgrade "
        "(forces a fresh download on the next run)",
    )
    parser.add_argument(
        "--yes", "-y", action="store_true", help="Skip the confirmation prompt"
    )
    args = parser.parse_args()

    if args.operator_only:
        targets = ["operator"]
    elif args.storage_only:
        targets = ["storage-operator"]
    else:
        targets = ["operator", "storage-operator"]

    _check_prerequisites()

    global versions
    versions = detect_versions()

    if not args.yes:
        confirm_versions(targets)

    log_step(f"Operator SDK Upgrade -> {versions.operator_sdk}")

    install_operator_sdk()

    for name in targets:
        spec = OPERATORS[name]
        log_step(f"========== Processing {name} ==========")

        if not args.skip_backup:
            backup_operator(spec)
        else:
            log_info("Skipping backup (--skip-backup)")
            if not spec.bak_dir.exists():
                die(
                    f"{spec.bak_dir} does not exist; cannot use --skip-backup "
                    "without an existing backup directory"
                )
            if spec.op_dir.exists():
                shutil.rmtree(spec.op_dir)

        try:
            scaffold_project(spec)
            merge_backup(spec)
            adapt_project(spec)
            generate_and_build(spec)
        except BaseException:
            _log_recovery_hint(name)
            raise

    if args.clean_tools:
        _clean_tools()

    log_step("Upgrade complete!")
    print()
    log_info("Backups preserved at:")
    for name in targets:
        log_info(f"  {OPERATORS[name].bak_dir}/")
    print()
    log_info("Recommended next steps:")
    log_info("  1. diff -r <op>.bak/ <op>/     Review changes")
    log_info("  2. cd <op> && make test         Run tests")
    log_info("  3. Review config/crd/bases/     Check generated CRDs")
    log_info("  4. Review config/rbac/role.yaml Check generated RBAC")
    log_info("  5. Review deploy/manifests.yaml Check MetalK8s manifests")


if __name__ == "__main__":
    main()

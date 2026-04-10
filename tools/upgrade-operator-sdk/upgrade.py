#!/usr/bin/env python3
"""Automates the upgrade of operator-sdk based projects.

Scaffolds a fresh project, detects the latest Go and k8s.io patch
versions, restores custom code from a backup, applies GNU patch files,
and runs the build pipeline.

Usage:
    python3 scripts/upgrade-operator-sdk/upgrade.py \\
        --operator-dir <path> --config-dir <path> [OPTIONS]

Examples:
    python3 scripts/upgrade-operator-sdk/upgrade.py \\
        --operator-dir operator \\
        --config-dir scripts/upgrade-operator-sdk/operator

Options:
    --operator-dir     Path to the operator project directory (required)
    --config-dir       Path to the config directory (required)
    --skip-backup      Skip the backup step (assumes .bak already exists)
    --clean-tools      Remove tool cache after the upgrade (forces re-download)
    --yes, -y          Skip the confirmation prompt
    -h, --help         Show this help message

Environment variables:
    GITHUB_TOKEN       Optional; raises GitHub API rate limit from 60
                       to 5000 req/hour for operator-sdk release checks.

Requires: go, curl, patch, pyyaml (pip install pyyaml)
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
from pathlib import Path
from typing import Any, Final, NoReturn

try:
    import yaml
except ImportError:
    print("pyyaml is required: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
TOOLS_BIN: Final = Path.home() / ".cache" / "upgrade-operator-sdk" / "bin"
_SDK_BIN: Final = TOOLS_BIN / "operator-sdk"

_ENCODING: Final = "utf-8"

# ---------------------------------------------------------------------------
# URLs & HTTP
# ---------------------------------------------------------------------------
_URL_OPERATOR_SDK_DOWNLOAD: Final = (
    "https://github.com/operator-framework/operator-sdk"
    "/releases/download/{version}/operator-sdk_{goos}_{goarch}"
)
_GITHUB_RELEASES_URL: Final = "https://api.github.com/repos/{repo}/releases/latest"
_GITHUB_REPO_OPERATOR_SDK: Final = "operator-framework/operator-sdk"
_URL_GO_RELEASES: Final = "https://go.dev/dl/?mode=json&include=all"
_URL_GO_MODULE_VERSIONS: Final = "https://proxy.golang.org/{module}/@v/list"

_HTTP_RETRIES: Final = 3

# k8s.io libraries bumped together (lock-step releases).
_K8S_LIBS: Final = ("k8s.io/api", "k8s.io/apimachinery", "k8s.io/client-go")
# We only query one module on the proxy — all three share the same version.
_K8S_LIB_MODULE: Final = _K8S_LIBS[0]

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


def _http_get(url: str, *, headers: dict[str, str] | None = None) -> bytes:
    req = urllib.request.Request(url, headers=headers or {})
    for attempt in range(_HTTP_RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data: bytes = resp.read()
                return data
        except urllib.error.HTTPError:
            raise
        except urllib.error.URLError as exc:
            if attempt < _HTTP_RETRIES - 1:
                delay = 2 ** (attempt + 1)
                log_warn(
                    f"Request to {url} failed ({exc.reason}), "
                    f"retrying in {delay}s..."
                )
                time.sleep(delay)
            else:
                raise
    raise RuntimeError("_http_get: unreachable")


def _fetch_json(url: str) -> Any:
    try:
        return json.loads(_http_get(url))
    except urllib.error.HTTPError as e:
        die(f"HTTP {e.code} for {url}")
    except urllib.error.URLError as e:
        die(f"Failed to fetch {url}: {e.reason}")


def _fetch_text(url: str) -> str:
    try:
        return _http_get(url).decode(_ENCODING)
    except urllib.error.HTTPError as e:
        die(f"HTTP {e.code} for {url}")
    except urllib.error.URLError as e:
        die(f"Failed to fetch {url}: {e.reason}")


def _github_headers() -> dict[str, str]:
    """Return GitHub API headers. Uses GITHUB_TOKEN if set (raises rate limit)."""
    headers: dict[str, str] = {}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _fetch_latest_github_release(repo: str) -> str:
    """Return the latest release tag, or empty string on failure."""
    try:
        data = json.loads(
            _http_get(
                _GITHUB_RELEASES_URL.format(repo=repo),
                headers=_github_headers(),
            )
        )
        return str(data["tag_name"])
    except (urllib.error.HTTPError, urllib.error.URLError) as e:
        log_warn(f"Could not fetch latest release for {repo}: {e}")
        return ""


# ---------------------------------------------------------------------------
# Config loading
# ---------------------------------------------------------------------------


def load_config(config_dir: str, operator_dir: str) -> dict[str, Any]:
    """Load and validate the operator config from a directory."""
    d = Path(config_dir).resolve()
    config_file = d / "config.yaml"
    if not config_file.exists():
        die(f"Config file not found: {config_file}")
    with config_file.open(encoding=_ENCODING) as f:
        cfg: dict[str, Any] = yaml.safe_load(f)

    for key in ("repo", "domain", "apis", "operator_sdk_version"):
        if key not in cfg:
            die(f"Missing required key {key!r} in {config_file}")

    op = Path(operator_dir).resolve()
    cfg["name"] = d.name
    cfg["config_file"] = config_file
    cfg["operator_dir"] = op
    cfg["patches_dir"] = d / "patches"
    cfg["backup_dir"] = op.parent / f"{op.name}.bak"
    cfg.setdefault("raw_copy", [])
    cfg.setdefault("delete", [])
    cfg.setdefault("extra_commands", [])

    return cfg


# ---------------------------------------------------------------------------
# Version detection from scaffold go.mod
# ---------------------------------------------------------------------------


def _latest_go_patch(go_major_minor: str) -> str:
    """Query go.dev for the latest stable patch of *go_major_minor*."""
    releases = _fetch_json(_URL_GO_RELEASES)
    prefix = f"go{go_major_minor}."
    return next(
        (
            r["version"]
            for r in releases
            if r["version"].startswith(prefix) and r.get("stable")
        ),
        f"go{go_major_minor}.0",
    )


def _latest_k8s_patch(base_version: str) -> str:
    """Query Go module proxy for the latest stable k8s.io patch."""
    m = re.match(r"(v\d+\.\d+)\.", base_version)
    if not m:
        return base_version
    prefix = m.group(1) + "."
    content = _fetch_text(_URL_GO_MODULE_VERSIONS.format(module=_K8S_LIB_MODULE))
    # Filter stable releases only (skip pre-releases containing "-").
    candidates = [
        v.strip()
        for v in content.splitlines()
        if v.strip().startswith(prefix) and "-" not in v.strip()
    ]
    if not candidates:
        return base_version

    def _patch_num(v: str) -> int:
        try:
            return int(v.rsplit(".", 1)[-1])
        except ValueError:
            return -1

    return max(candidates, key=_patch_num)


def detect_latest_patches(cfg: dict[str, Any]) -> dict[str, str]:
    """Read the scaffold go.mod and resolve latest patch versions.

    Also checks the latest operator-sdk release on GitHub.
    """
    log_step("Detecting latest available versions")
    detected: dict[str, str] = {}

    # operator-sdk: latest GitHub release
    log_info("Querying GitHub for latest operator-sdk release...")
    latest_sdk = _fetch_latest_github_release(_GITHUB_REPO_OPERATOR_SDK)
    if latest_sdk:
        detected["operator_sdk_version"] = latest_sdk
        log_info(f"  operator-sdk:  {latest_sdk}")

    # Go and k8s.io: from scaffold go.mod
    gomod_path = cfg["operator_dir"] / "go.mod"
    if not gomod_path.exists():
        die(f"go.mod not found at {gomod_path}")
    gomod = gomod_path.read_text(encoding=_ENCODING)

    m_go = re.search(r"^go\s+(\d+\.\d+)", gomod, re.MULTILINE)
    if not m_go:
        die("Failed to parse Go version from scaffold go.mod")
    go_major_minor = m_go.group(1)

    log_info(f"Scaffold Go version: {go_major_minor}")
    log_info("Querying go.dev for latest patch...")
    go_toolchain = _latest_go_patch(go_major_minor)
    detected["go_toolchain"] = go_toolchain
    log_info(f"  Go toolchain:  {go_toolchain}")

    m_k8s = re.search(r"k8s\.io/api\s+(v\S+)", gomod)
    if m_k8s:
        k8s_base = m_k8s.group(1)
        log_info(f"Scaffold k8s.io/api: {k8s_base}")
        log_info("Querying module proxy for latest patch...")
        k8s_libs = _latest_k8s_patch(k8s_base)
        detected["k8s_libs"] = k8s_libs
        log_info(f"  k8s.io libs:   {k8s_libs}")

    return detected


def reconcile_versions(
    cfg: dict[str, Any],
    detected: dict[str, str],
) -> None:
    """Compare detected versions with YAML pins.

    - No pin: use detected, log info.
    - Pin < detected: warn (newer available), keep pinned.
    - Pin == detected: all good.
    - Pin > detected: warn (unusual), use detected.

    Never modifies the YAML file. Zero interactive input -- CI-safe.
    """
    log_step("Reconciling versions")

    for key in ("operator_sdk_version", "go_toolchain", "k8s_libs"):
        found = detected.get(key, "")
        if not found:
            continue
        pinned = cfg.get(key, "")

        if not pinned:
            log_info(f"  {key}: {found} (detected, not pinned)")
            cfg[key] = found
        elif found == pinned:
            log_info(f"  {key}: {pinned} (up to date)")
        elif found > pinned:  # lexicographic, works for semver
            log_warn(f"  {key}: pinned {pinned}, newer {found} available")
            cfg[key] = pinned
        else:
            log_warn(f"  {key}: pinned {pinned} > detected {found}, using detected")
            cfg[key] = found


def confirm_upgrade(cfg: dict[str, Any]) -> None:
    """Print config summary and ask the user to confirm."""
    print()
    print(f"{_BOLD}The following upgrade will be performed:{_RESET}")
    print()
    print(f"  operator-sdk   {cfg['operator_sdk_version']}")
    print()
    print(f"  Target:           {cfg['name']}")
    print(f"  Operator dir:     {cfg['operator_dir']}")
    print()
    answer = input(f"{_BOLD}Proceed? [y/N] {_RESET}").strip().lower()
    if answer not in ("y", "yes"):
        log_info("Aborted by user.")
        sys.exit(0)


# ---------------------------------------------------------------------------
# Process execution
# ---------------------------------------------------------------------------


def _tool_env(cfg: dict[str, Any]) -> dict[str, str]:
    env: dict[str, str] = {
        "PATH": f"{TOOLS_BIN}:{os.environ.get('PATH', '')}",
    }
    # Set after reconcile_versions() resolves the latest patch.
    if cfg.get("go_toolchain"):
        env["GOTOOLCHAIN"] = cfg["go_toolchain"]
    return env


def run(
    cmd: list[str],
    cfg: dict[str, Any],
    *,
    cwd: Path | None = None,
    check: bool = True,
    capture: bool = False,
) -> subprocess.CompletedProcess[Any]:
    merged_env = {**os.environ, **_tool_env(cfg)}
    kwargs: dict[str, Any] = {"cwd": cwd, "env": merged_env}
    if capture:
        kwargs["capture_output"] = True
        kwargs["text"] = True
    return subprocess.run(cmd, check=check, **kwargs)


# ===================================================================
# Phase 0 — Install tools
# ===================================================================


def _check_prerequisites() -> None:
    missing = [tool for tool in ("go", "curl", "patch") if shutil.which(tool) is None]
    if missing:
        die(f"Required tools not found in PATH: {', '.join(missing)}")


def install_operator_sdk(cfg: dict[str, Any]) -> None:
    version = cfg["operator_sdk_version"]
    log_step(f"Installing operator-sdk {version}")
    TOOLS_BIN.mkdir(parents=True, exist_ok=True)

    if _SDK_BIN.exists():
        result = run([str(_SDK_BIN), "version"], cfg, capture=True, check=False)
        if version.lstrip("v") in result.stdout:
            log_info("Already installed")
            return

    goos = run(["go", "env", "GOOS"], cfg, capture=True).stdout.strip()
    goarch = run(["go", "env", "GOARCH"], cfg, capture=True).stdout.strip()
    url = _URL_OPERATOR_SDK_DOWNLOAD.format(version=version, goos=goos, goarch=goarch)
    log_info(f"Downloading for {goos}/{goarch}...")
    run(["curl", "-sSLo", str(_SDK_BIN), url], cfg)
    _SDK_BIN.chmod(0o755)
    ver = (
        run([str(_SDK_BIN), "version"], cfg, capture=True).stdout.strip().split("\n")[0]
    )
    log_info(f"Installed: {ver}")


# ===================================================================
# Phase 1 — Backup
# ===================================================================


def backup_operator(cfg: dict[str, Any]) -> None:
    op_dir: Path = cfg["operator_dir"]
    bak: Path = cfg["backup_dir"]
    log_step(f"Phase 1: Backing up {cfg['name']}")

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


def scaffold_project(cfg: dict[str, Any]) -> None:
    op_dir: Path = cfg["operator_dir"]
    sdk = str(_SDK_BIN)
    log_step(f"Phase 2: Scaffolding {cfg['name']}")

    op_dir.mkdir(parents=True, exist_ok=True)

    run(
        [
            sdk,
            "init",
            "--domain",
            cfg["domain"],
            "--repo",
            cfg["repo"],
            "--project-name",
            cfg["name"],
        ],
        cfg,
        cwd=op_dir,
    )

    for api in cfg["apis"]:
        _create_api(op_dir, sdk, api, cfg)

    _delete_scaffold_files(cfg)

    log_info("Scaffold complete")


def _delete_scaffold_files(cfg: dict[str, Any]) -> None:
    """Remove files/dirs listed in the 'delete' config field."""
    op_dir: Path = cfg["operator_dir"]
    for rel_path in cfg.get("delete", []):
        target = op_dir / rel_path
        if not target.exists():
            continue
        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()
        log_info(f"  Deleted {rel_path}")


def _create_api(
    op_dir: Path, sdk: str, api: dict[str, Any], cfg: dict[str, Any]
) -> None:
    group = api.get("group", "")
    version = api["version"]
    kind = api["kind"]
    tail = ["--version", version, "--kind", kind, "--resource", "--controller"]

    if not api.get("namespaced", True):
        tail.append("--namespaced=false")

    cmd = [sdk, "create", "api"]
    if group:
        cmd += ["--group", group]
    cmd += tail

    result = run(cmd, cfg, cwd=op_dir, check=False)
    if result.returncode != 0:
        die(f"Failed to create API {kind} (exit {result.returncode})")

    log_info(f"Created {kind} API (group={group!r})")


# ===================================================================
# Phase 3 — Restore custom code from backup
# ===================================================================


def restore_backup(cfg: dict[str, Any]) -> None:
    """Copy raw_copy entries from backup into the scaffold output.

    Entries are directories or files that are purely custom (not
    generated by operator-sdk). The scaffold version is replaced
    entirely for directories.

    For files: if the file already exists in the scaffold, an error is
    raised with a diff.  For directories: the scaffold directory is
    replaced entirely.
    """
    op_dir: Path = cfg["operator_dir"]
    bak: Path = cfg["backup_dir"]
    log_step(f"Phase 3: Restoring custom code for {cfg['name']}")

    count = 0
    for rel_path in cfg["raw_copy"]:
        src = bak / rel_path
        dst = op_dir / rel_path

        if not src.exists():
            die(f"  {rel_path} not found in backup at {src}")

        if src.is_dir():
            if dst.exists():
                # Compare scaffold vs backup; skip if identical, error if different.
                result = subprocess.run(
                    ["diff", "-rq", str(dst), str(src)],
                    capture_output=True,
                    text=True,
                )
                if result.returncode == 0:
                    n = sum(1 for _ in dst.rglob("*") if _.is_file())
                    log_info(f"  {rel_path} ({n} files, identical to scaffold)")
                    count += n
                    continue
                log_error(f"  {rel_path} exists in scaffold with different content")
                subprocess.run(
                    ["diff", "-ru", str(dst), str(src)],
                    capture_output=False,
                )
                die(
                    f"Conflict in {rel_path}. Update the directory in "
                    ".bak/ then re-run with --skip-backup."
                )
            shutil.copytree(src, dst)
            n = sum(1 for _ in dst.rglob("*") if _.is_file())
            log_info(f"  {rel_path} ({n} files)")
            count += n
        else:
            if dst.exists():
                log_error(f"  {rel_path} exists in both scaffold and backup")
                result = subprocess.run(
                    ["diff", "-u", str(dst), str(src)],
                    capture_output=True,
                    text=True,
                )
                if result.stdout:
                    print(result.stdout)
                die(
                    f"Conflict: {rel_path}. Update the file in .bak/ "
                    "then re-run with --skip-backup."
                )
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(src, dst)
            log_info(f"  {rel_path}")
            count += 1

    log_info(f"Custom code restored: {count} file(s)")


# ===================================================================
# Phase 4 — Apply patches and placeholder substitutions
# ===================================================================


def adapt_project(cfg: dict[str, Any]) -> None:
    """Apply patch files and substitute placeholders."""
    _apply_patches(cfg)
    _substitute_placeholders(cfg)


def _apply_patches(cfg: dict[str, Any]) -> None:
    patch_dir: Path = cfg["patches_dir"]
    op_dir: Path = cfg["operator_dir"]

    if not patch_dir.is_dir():
        log_warn(f"No patch directory found at {patch_dir}")
        return

    for patch_file in sorted(patch_dir.glob("*.patch")):
        log_info(f"Applying {patch_file.name}...")
        result = subprocess.run(
            [
                "patch",
                "-p1",
                "--forward",
                "--no-backup-if-mismatch",
                "-i",
                str(patch_file),
            ],
            cwd=op_dir,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            log_warn(
                f"{patch_file.name} did not apply cleanly "
                f"(exit {result.returncode}); resolve manually:\n"
                f"  {result.stdout.strip()}"
            )
        else:
            log_info(f"  {patch_file.name} applied")


def _substitute_placeholders(cfg: dict[str, Any]) -> None:
    op_dir: Path = cfg["operator_dir"]

    makefile = op_dir / "Makefile"
    if makefile.exists():
        text = makefile.read_text(encoding=_ENCODING)
        if cfg.get("go_toolchain"):
            text = text.replace("__GOTOOLCHAIN__", cfg["go_toolchain"])
        makefile.write_text(text, encoding=_ENCODING)

    log_info("Placeholders substituted")


# ===================================================================
# Phase 5 — Generate
# ===================================================================


def generate(cfg: dict[str, Any]) -> None:
    op_dir: Path = cfg["operator_dir"]
    log_step(f"Phase 5: Generate & verify {cfg['name']}")

    # Remove scaffold-generated bin/ to force fresh tool downloads
    # via the Makefile (kustomize, controller-gen, etc.).
    bin_dir = op_dir / "bin"
    if bin_dir.exists():
        shutil.rmtree(bin_dir)

    if cfg.get("k8s_libs"):
        k8s_get = [f"{lib}@{cfg['k8s_libs']}" for lib in _K8S_LIBS]
        log_info(f"Pinning k8s.io libs to {cfg['k8s_libs']}...")
        run(["go", "get", *k8s_get], cfg, cwd=op_dir)

    steps: list[tuple[str, list[str]]] = [
        ("go mod tidy...", ["go", "mod", "tidy"]),
        ("make manifests generate...", ["make", "manifests", "generate"]),
        ("make fmt vet...", ["make", "fmt", "vet"]),
    ]
    for msg, cmd in steps:
        log_info(msg)
        run(cmd, cfg, cwd=op_dir)

    for extra in cfg.get("extra_commands", []):
        log_info(f"Running {' '.join(extra)}...")
        run(extra, cfg, cwd=op_dir)

    log_info(f"Build succeeded for {cfg['name']}")


# ===================================================================
# Cleanup
# ===================================================================


def _clean_tools() -> None:
    """Remove the tool cache."""
    if TOOLS_BIN.exists():
        log_step(f"Cleaning tool cache ({TOOLS_BIN})")
        shutil.rmtree(TOOLS_BIN)
        log_info(f"Removed {TOOLS_BIN}")
    else:
        log_info("Tool cache already empty")


# ===================================================================
# Recovery
# ===================================================================


def _log_recovery_hint(cfg: dict[str, Any]) -> None:
    op_dir: Path = cfg["operator_dir"]
    bak: Path = cfg["backup_dir"]
    log_error(f"Processing of '{cfg['name']}' was interrupted or failed")
    if bak.exists():
        log_warn(f"Backup preserved at: {bak}")
    if op_dir.exists() and bak.exists():
        log_warn("To restore the original state:")
        log_warn(f"  rm -rf {op_dir} && mv {bak} {op_dir}")
    elif bak.exists():
        log_warn(f"To restore: mv {bak} {op_dir}")


# ===================================================================
# Main
# ===================================================================


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Upgrade an operator-sdk project by scaffolding "
        "fresh and applying patches from a config directory.",
    )
    parser.add_argument(
        "--config-dir",
        required=True,
        help="Path to config directory containing config.yaml and patches/",
    )
    parser.add_argument(
        "--operator-dir",
        required=True,
        help="Path to the operator project directory",
    )
    parser.add_argument(
        "--skip-backup",
        action="store_true",
        help="Skip backup (assumes .bak exists)",
    )
    parser.add_argument(
        "--clean-tools",
        action="store_true",
        help="Remove tool cache after upgrade",
    )
    parser.add_argument(
        "--yes",
        "-y",
        action="store_true",
        help="Skip the confirmation prompt",
    )
    args = parser.parse_args()

    _check_prerequisites()

    cfg = load_config(args.config_dir, args.operator_dir)

    if not args.yes:
        confirm_upgrade(cfg)

    log_step(f"Operator SDK Upgrade -> {cfg['operator_sdk_version']}")

    install_operator_sdk(cfg)

    op_dir: Path = cfg["operator_dir"]
    bak: Path = cfg["backup_dir"]

    if not args.skip_backup:
        backup_operator(cfg)
    else:
        log_info("Skipping backup (--skip-backup)")
        if not bak.exists():
            die(
                f"{bak} does not exist; cannot use --skip-backup "
                "without an existing backup directory"
            )
        if op_dir.exists():
            shutil.rmtree(op_dir)

    try:
        scaffold_project(cfg)  # Phase 2
        detected = detect_latest_patches(cfg)  # Phase 2b
        reconcile_versions(cfg, detected)  # compare & pin
        log_info(
            f"Using: Go {cfg.get('go_toolchain', 'scaffold')}"
            f", k8s.io {cfg.get('k8s_libs', 'scaffold')}"
        )
        restore_backup(cfg)  # Phase 3
        adapt_project(cfg)  # Phase 4
        generate(cfg)  # Phase 5
    except BaseException:
        _log_recovery_hint(cfg)
        raise

    if args.clean_tools:
        _clean_tools()

    log_step("Upgrade complete!")
    print()
    log_info(f"Backup preserved at: {bak}/")
    print()
    log_info("Recommended next steps:")
    log_info("  1. git diff")
    log_info(f"  2. cd {cfg['name']} && make test")


if __name__ == "__main__":
    main()

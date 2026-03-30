#!/usr/bin/env python3
"""Automates the upgrade of operator-sdk based projects.

Scaffolds a fresh project, restores custom code from a backup, applies
GNU patch files, and runs the build pipeline. All versions are pinned
in the YAML config file — the script makes no version-detection API calls.

Usage:
    python3 scripts/upgrade-operator-sdk/upgrade.py <name> [OPTIONS]

Examples:
    python3 scripts/upgrade-operator-sdk/upgrade.py operator
    python3 scripts/upgrade-operator-sdk/upgrade.py storage-operator

The <name> is resolved relative to the script directory. A full path
can also be given for configs stored elsewhere.

Options:
    --skip-backup      Skip the backup step (assumes .bak already exists)
    --clean-tools      Remove .tmp/bin/ after the upgrade (forces re-download)
    --yes, -y          Skip the confirmation prompt
    -h, --help         Show this help message

Requires: go, curl, patch, pyyaml (pip install pyyaml)
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
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
REPO_ROOT: Final = Path(__file__).resolve().parent.parent.parent
TOOLS_BIN: Final = REPO_ROOT / ".tmp" / "bin"
_SDK_BIN: Final = TOOLS_BIN / "operator-sdk"

# All file I/O uses this encoding explicitly.
_ENCODING: Final = "utf-8"

# ---------------------------------------------------------------------------
# URLs
# ---------------------------------------------------------------------------
_URL_OPERATOR_SDK_DOWNLOAD: Final = (
    "https://github.com/operator-framework/operator-sdk"
    "/releases/download/{version}/operator-sdk_{goos}_{goarch}"
)

# k8s.io libraries bumped together (lock-step releases).
_K8S_LIBS: Final = ("k8s.io/api", "k8s.io/apimachinery", "k8s.io/client-go")

# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------
_PAT_DOCKERFILE_FROM_GOLANG: Final = r"FROM golang:\d+\.\d+"

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
# Config loading
# ---------------------------------------------------------------------------


def load_config(config_dir: str) -> dict[str, Any]:
    """Load and validate the operator config from a directory.

    The directory must contain ``config.yaml`` and may contain a
    ``patches/`` subdirectory with GNU unified diff files.

    If *config_dir* is a plain name (no path separators), it is resolved
    relative to the script's own directory — so ``operator`` finds
    ``scripts/upgrade-operator-sdk/operator/``.  Otherwise it is used
    as-is, allowing absolute or relative paths for other repos.
    """
    p = Path(config_dir)
    if not p.is_absolute() and os.sep not in config_dir and "/" not in config_dir:
        p = Path(__file__).resolve().parent / config_dir
    d = p.resolve()
    config_file = d / "config.yaml"
    if not config_file.exists():
        die(f"Config file not found: {config_file}")
    with config_file.open(encoding=_ENCODING) as f:
        cfg: dict[str, Any] = yaml.safe_load(f)

    required = (
        "repo",
        "domain",
        "operator_dir",
        "apis",
        "operator_sdk_version",
        "go_toolchain",
    )
    for key in required:
        if key not in cfg:
            die(f"Missing required key {key!r} in {config_file}")

    cfg["name"] = d.name
    cfg.setdefault("backup_paths", [])
    cfg.setdefault("extra_commands", [])
    cfg.setdefault("k8s_libs", "")
    cfg["operator_dir"] = REPO_ROOT / cfg["operator_dir"]
    cfg["patches_dir"] = d / "patches"
    cfg["backup_dir"] = REPO_ROOT / f"{cfg['operator_dir'].name}.bak"

    tc = cfg["go_toolchain"]
    m = re.match(r"go(\d+\.\d+)", tc)
    cfg["go_major_minor"] = m.group(1) if m else tc.lstrip("go")

    return cfg


def confirm_upgrade(cfg: dict[str, Any]) -> None:
    """Print config summary and ask the user to confirm."""
    print()
    print(f"{_BOLD}The following upgrade will be performed:{_RESET}")
    print()
    print(f"  operator-sdk   {cfg['operator_sdk_version']}")
    print(f"  Go toolchain   {cfg['go_toolchain']}")
    if cfg["k8s_libs"]:
        print(f"  k8s.io libs    {cfg['k8s_libs']}")
    print()
    print(f"  Target:        {cfg['name']}")
    print(f"  Directory:     {cfg['operator_dir']}")
    print()
    answer = input(f"{_BOLD}Proceed? [y/N] {_RESET}").strip().lower()
    if answer not in ("y", "yes"):
        log_info("Aborted by user.")
        sys.exit(0)


# ---------------------------------------------------------------------------
# Process execution
# ---------------------------------------------------------------------------


def _tool_env(cfg: dict[str, Any]) -> dict[str, str]:
    return {
        "PATH": f"{TOOLS_BIN}:{os.environ.get('PATH', '')}",
        "GOTOOLCHAIN": cfg["go_toolchain"],
    }


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

    devcontainer = op_dir / ".devcontainer"
    if devcontainer.exists():
        shutil.rmtree(devcontainer)
        log_info("Removed .devcontainer/ (not needed)")

    log_info("Scaffold complete")


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
    op_dir: Path = cfg["operator_dir"]
    bak: Path = cfg["backup_dir"]
    log_step(f"Phase 3: Restoring custom code for {cfg['name']}")

    count = 0
    conflicts: list[str] = []
    for rel_path in cfg["backup_paths"]:
        src = bak / rel_path
        dst = op_dir / rel_path

        if not src.exists():
            log_warn(f"  {rel_path} not found in backup, skipping")
            continue

        is_dir = rel_path.endswith("/")

        if is_dir:
            if dst.exists():
                shutil.rmtree(dst)
            shutil.copytree(
                src,
                dst,
                ignore=shutil.ignore_patterns("*zz_generated*"),
            )
            n = sum(1 for _ in dst.rglob("*") if _.is_file())
            log_info(f"  {rel_path} ({n} files)")
            count += n
        else:
            if "zz_generated" in rel_path:
                continue
            if dst.exists():
                log_error(f"  {rel_path} exists in both scaffold and backup")
                result = subprocess.run(
                    ["diff", "-u", str(dst), str(src)],
                    capture_output=True,
                    text=True,
                )
                if result.stdout:
                    print(result.stdout)
                conflicts.append(rel_path)
                continue
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(src, dst)
            log_info(f"  {rel_path}")
            count += 1

    if conflicts:
        log_error(f"{len(conflicts)} file(s) conflict between scaffold and backup:")
        for c in conflicts:
            log_error(f"  - {c}")
        log_info(
            "Update the conflicting files in the .bak/ directory to match "
            "the desired result, then re-run with --skip-backup."
        )
        die("Aborting due to backup/scaffold conflicts")

    log_info(f"Custom code restored: {count} file(s)")


# ===================================================================
# Phase 4 — Apply patches and version substitutions
# ===================================================================


def adapt_project(cfg: dict[str, Any]) -> None:
    """Apply patch files and substitute dynamic versions."""
    _apply_patches(cfg)
    _substitute_versions(cfg)


def _apply_patches(cfg: dict[str, Any]) -> None:
    patch_dir: Path = cfg["patches_dir"]
    op_dir: Path = cfg["operator_dir"]

    if not patch_dir.is_dir():
        log_warn(f"No patch directory found at {patch_dir}")
        return

    for patch_file in sorted(patch_dir.glob("*.patch")):
        log_info(f"Applying {patch_file.name}...")
        result = subprocess.run(
            ["patch", "-p1", "--no-backup-if-mismatch", "-i", str(patch_file)],
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


def _substitute_versions(cfg: dict[str, Any]) -> None:
    op_dir: Path = cfg["operator_dir"]

    dockerfile = op_dir / "Dockerfile"
    if dockerfile.exists():
        text = dockerfile.read_text(encoding=_ENCODING)
        text = re.sub(
            _PAT_DOCKERFILE_FROM_GOLANG,
            f"FROM golang:{cfg['go_major_minor']}",
            text,
        )
        dockerfile.write_text(text, encoding=_ENCODING)

    makefile = op_dir / "Makefile"
    if makefile.exists():
        text = makefile.read_text(encoding=_ENCODING)
        text = text.replace("__GOTOOLCHAIN__", cfg["go_toolchain"])
        text = text.replace("__IMAGE__", cfg.get("image_placeholder", ""))
        makefile.write_text(text, encoding=_ENCODING)

    log_info("Version substitutions applied")


# ===================================================================
# Phase 5 — Generate
# ===================================================================


def generate(cfg: dict[str, Any]) -> None:
    op_dir: Path = cfg["operator_dir"]
    log_step(f"Phase 5: Generate & verify {cfg['name']}")

    bin_dir = op_dir / "bin"
    if bin_dir.exists():
        shutil.rmtree(bin_dir)

    if cfg["k8s_libs"]:
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
    """Remove the script's tool cache (.tmp/bin/)."""
    if TOOLS_BIN.exists():
        log_step(f"Cleaning tool cache ({TOOLS_BIN.relative_to(REPO_ROOT)}/)")
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
        log_warn("Partial build detected. To restore the original state:")
        log_warn(f"  rm -rf {op_dir} && mv {bak} {op_dir}")
    elif bak.exists():
        log_warn(f"To restore: mv {bak} {op_dir}")


# ===================================================================
# Main
# ===================================================================


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Upgrade an operator-sdk project by scaffolding fresh "
        "and applying patches from a YAML config.",
    )
    parser.add_argument(
        "config_dir",
        help="Operator config directory name (e.g. 'operator') or full "
        "path to a directory containing config.yaml",
    )
    parser.add_argument(
        "--skip-backup",
        action="store_true",
        help="Skip backup (assumes .bak exists)",
    )
    parser.add_argument(
        "--clean-tools",
        action="store_true",
        help="Remove .tmp/bin/ after upgrade",
    )
    parser.add_argument(
        "--yes",
        "-y",
        action="store_true",
        help="Skip the confirmation prompt",
    )
    args = parser.parse_args()

    _check_prerequisites()

    cfg = load_config(args.config_dir)

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
        scaffold_project(cfg)
        restore_backup(cfg)
        adapt_project(cfg)
        generate(cfg)
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
    log_info("  1. git diff                     Review changes")
    log_info(f"  2. cd {cfg['name']} && make test Run tests")


if __name__ == "__main__":
    main()

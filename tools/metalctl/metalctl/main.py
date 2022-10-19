from pathlib import Path
import sys

import click

from metalctl import checks
from metalctl.checkpoint import Checkpointer
from metalctl import errors
from metalctl import log
from metalctl.salt import salt_call, salt_run, salt
from metalctl import scripts
from metalctl import utils


verbose_option = click.option("-v", "--verbose", help="Run in verbose mode", count=True)
log_file_option = lambda step: click.option(
    "-l",
    "--log-file",
    help=f"Change log file (default: {log.default_log_file(step)})",
    callback=lambda _ctx, _param, value: log.prepare_log_file(value),
    default=log.default_log_file(step),
)
silent_option = click.option(
    "-s",
    "--silent",
    help="Run in silent mode",
    is_flag=True,
    default=False,
)
color_option = click.option(
    "--color/--no-color",
    help="Enable / disable color in console (detected depending on the terminal by default)",
    default=None,
)


@click.group()
def main():
    """Main entrypoint."""


@main.command()
@verbose_option
@silent_option
@color_option
@log_file_option("upgrade")
@click.option(
    "--dry-run", is_flag=True, help="Run actions in dry-run mode", default=False
)
@click.option(
    "-t",
    "--drain-timeout",
    help="Change the node drain timeout (in seconds)",
    default=0,
)
@click.option(
    "-d", "--destination-version", help="MetalK8s version to upgrade to", required=True
)
def upgrade(
    verbose: int,
    silent: bool,
    color: bool,
    log_file: Path,
    dry_run: bool,
    drain_timeout: int,
    destination_version: str,
):
    """Upgrade a MetalK8s cluster."""
    log.setup_logging(
        scripts.upgrade.logger, log_file, verbosity=verbose, silent=silent, color=color
    )
    saltenv = f"metalk8s-{destination_version}"

    checks.pre_upgrade(destination_version)
    if dry_run:
        return

    scripts.backup.run(logger=scripts.upgrade.logger)

    try:
        scripts.upgrade.run_all(destination_version, drain_timeout)
    except errors.Error as exc:
        scripts.upgrade.logger.error("Upgrade failed:\n%s", exc)
        sys.exit(1)
        return

    scripts.backup.run(logger=scripts.upgrade.logger)


@main.command()
@verbose_option
@silent_option
@color_option
@log_file_option("backup")
def backup(verbose: int, silent: bool, color: bool, log_file: Path):
    """Backup a MetalK8s bootstrap node (including etcd)."""
    log.setup_logging(
        scripts.backup.logger, log_file, verbosity=verbose, silent=silent, color=color
    )
    scripts.backup.run()


@main.command()
@click.option(
    "-d", "--destination-version", help="MetalK8s version to upgrade to", required=True
)
def test(destination_version: str):
    log.setup_logging(scripts.test.logger, log.default_log_file("test"), verbosity=2)
    scripts.test.run(saltenv=f"metalk8s-{destination_version}", prompt_for_retry=True)

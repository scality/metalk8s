import logging
import subprocess
import time

import click

from metalctl import errors


default_logger = logging.getLogger(__name__)


def run_command(
    *args, encoding="utf-8", capture_output=True
) -> subprocess.CompletedProcess:
    return subprocess.run(
        args,
        encoding=encoding,
        stdout=subprocess.PIPE if capture_output else None,
        stderr=subprocess.PIPE if capture_output else None,
    )


def raise_or_return(
    result: subprocess.CompletedProcess,
    transform=lambda x: x,
    logger: logging.Logger = default_logger,
):
    if result.returncode != 0:
        err = errors.ResultError(result)
        logger.error(str(err))
        raise err
    return transform(result)


def retry(fun, retries=0, sleep=1, on_errors=(Exception,)):
    attempts = 0
    while attempts <= retries:
        attempts += 1
        try:
            return fun()
        except on_errors as exc:
            last_error = exc
            time.sleep(sleep)
    raise last_error


def prompt_for_retry(fun, on_errors=(Exception,)):
    while True:
        try:
            return fun()
        except on_errors as exc:
            click.secho(f"An error occured:\n{exc!s}", err=True, fg="red")
            should_retry = click.confirm("Do you want to retry?")
            if not should_retry:
                raise

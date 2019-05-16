import logging
import time
from typing import Optional, Dict

import pytest


LOGGER = logging.getLogger(__name__)


def retry(operation, times=1, wait=1, error_msg=None, name="default"):
    for idx in range(times):
        try:
            operation()
        except AssertionError as exc:
            LOGGER.info(
                "[%s] Attempt %d/%d failed: %s", name, idx, times, str(exc)
            )
            time.sleep(wait)
        else:
            LOGGER.info("[%s] Attempt %d/%d succeeded", name, idx, times)
            break
    else:
        if error_msg is None:
            error_msg = (
                "Failed to run operation '{name}' after {attempts} attempts "
                "(waited {total}s in total)"
            ).format(name=name, attempts=times, total=times * wait)

        pytest.fail(error_msg)


def write_string(host, dest, contents):
    return host.run("cat > {} << EOF\n{}\nEOF".format(dest, contents))

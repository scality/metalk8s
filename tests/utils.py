import ipaddress
import logging
import re
import testinfra
import time
from typing import Optional, Dict

import pytest


LOGGER = logging.getLogger(__name__)


def retry(operation, times=1, wait=1, error_msg=None, name="default"):
    last_assert = None
    for idx in range(times):
        try:
            res = operation()
        except AssertionError as exc:
            last_assert = str(exc)
            LOGGER.info(
                "[%s] Attempt %d/%d failed: %s", name, idx, times, str(exc)
            )
            time.sleep(wait)
        else:
            LOGGER.info("[%s] Attempt %d/%d succeeded", name, idx, times)
            return res
    else:
        if error_msg is None:
            error_msg = (
                "Failed to run operation '{name}' after {attempts} attempts "
                "(waited {total}s in total)"
            ).format(name=name, attempts=times, total=times * wait)

        if last_assert:
            error_msg = error_msg + ': ' + last_assert

        pytest.fail(error_msg)


def write_string(host, dest, contents):
    return host.run("cat > {} << EOF\n{}\nEOF".format(dest, contents))


def get_ip_from_cidr(host, cidr):
    network = ipaddress.IPv4Network(cidr)
    with host.sudo():
        ip_info = host.check_output("ip a | grep 'inet '")
    for line in ip_info.splitlines():
        match = re.match(
            r'inet (?P<ip>[0-9]+(?:\.[0-9]+){3})/[0-9]+ ', line.strip()
        )
        assert match is not None, 'Unexpected format: {}'.format(line.strip())
        candidate = match.group('ip')
        if ipaddress.IPv4Address(candidate) in network:
            return candidate
    return None


def get_node_name(nodename, ssh_config=None):
    """Get a node name (from SSH config)."""
    if ssh_config is not None:
        node = testinfra.get_host(nodename, ssh_config=ssh_config)
        with node.sudo():
            return node.check_output(
                'salt-call --local --out txt grains.get id | cut -c 8-'
            )
    return nodename

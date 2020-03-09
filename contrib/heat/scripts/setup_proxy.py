#!/usr/bin/env python

import ConfigParser
import os
import errno

PROXY_HOST = "<%bastion_ip%>"
PROXY_PORT = "<%bastion_proxy_port%>"
PROXY_URL = "http://{}:{}".format(PROXY_HOST, PROXY_PORT)

assert os.path.isfile("/etc/redhat-release"), (
    "Can only run this script on RedHat-based systems."
)

with open("/etc/os-release", "r") as f:
    os_release = f.read().strip()


# RedHat Subscription Manager
if 'ID="rhel"' in os_release:
    rhsm_config = ConfigParser.RawConfigParser()
    rhsm_config.read("/etc/rhsm/rhsm.conf")

    rhsm_config.set("server", "proxy_hostname", PROXY_HOST)
    rhsm_config.set("server", "proxy_port", PROXY_PORT)

    with open("/etc/rhsm/rhsm.conf", "w") as f:
        rhsm_config.write(f)


# Yum Package Manager
yum_config = ConfigParser.RawConfigParser()
yum_config.read("/etc/yum.conf")

yum_config.set("main", "proxy", PROXY_URL)

with open("/etc/yum.conf", "w") as f:
    yum_config.write(f)


# Easy proxy environment setup / teardown for Bash
ACTIVATE_PROXY_SCRIPT_PATH = "/run/metalk8s/scripts/activate-proxy"
ACTIVATE_PROXY_SCRIPT = """
#!/bin/bash

export http_proxy="{proxy_url}"
export https_proxy="{proxy_url}"
export no_proxy="localhost,127.0.0.1,10.233.0.0/16,192.168.2.0/24,10.96.0.0/12,192.168.1.0/24"

deactivate-proxy() {{
  unset http_proxy
  unset https_proxy
}}
""".lstrip().format(proxy_url=PROXY_URL)

try:
    os.makedirs(os.path.dirname(ACTIVATE_PROXY_SCRIPT_PATH))
except os.error as exc:
    if exc.errno != errno.EEXIST:
        raise

with open(ACTIVATE_PROXY_SCRIPT_PATH, "w") as f:
    f.write(ACTIVATE_PROXY_SCRIPT)

os.chmod(ACTIVATE_PROXY_SCRIPT_PATH, 0o755)

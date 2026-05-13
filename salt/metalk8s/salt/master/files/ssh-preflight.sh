#!/bin/sh
# salt-ssh `ssh_pre_flight` script: ensure a Python interpreter compatible with
# the salt-ssh thin tarball is available on the target host before salt-ssh
# tries to deploy it. Salt 3006+ requires Python >= 3.7, while RHEL/Rocky 8
# ships Python 3.6 by default, hence we install python3.12 and switch the
# `python3` alternative to point at it.
#
# This script is invoked by salt-ssh through `/bin/sh`, so it must remain POSIX
# compatible. It is also expected to be idempotent: salt-ssh caches a success
# marker in the thin directory and skips subsequent runs, but the commands here
# are no-ops on hosts that already satisfy the requirement.
#
# The first argument is the privilege-escalation command (typically "sudo" or
# empty), forwarded by salt-ssh through `ssh_pre_flight_args` based on the
# roster's per-target `sudo` flag.
set -eu

SUDO="${1:-}"

$SUDO yum install -y python3.12
$SUDO alternatives --set python3 /usr/bin/python3.12

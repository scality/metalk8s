#!/bin/bash

set -e
set -u
set -x

# Vagrant libvirt doesn't handle static MAC addresses properly...

IFCFG_ETH0="/etc/sysconfig/network-scripts/ifcfg-eth0"

test "${PACKER_BUILDER_TYPE:-}" = "qemu" || exit 0
test -e "${IFCFG_ETH0}" || exit 0

sed -i -e 's/^HWADDR=.*//; s/^UUID=.*//' "${IFCFG_ETH0}"
echo "DEVICE=eth0" >> "${IFCFG_ETH0}"

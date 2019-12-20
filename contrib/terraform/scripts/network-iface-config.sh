#!/bin/bash
# This script needs to be replaced by a cloud-init script

declare -r MAC_ADDR=$1

if [ -z "$MAC_ADDR" ]; then
    echo "Must provide a MAC address" >&2
    exit 1
fi

IFACE=$(ip -br link | grep "$MAC_ADDR" | awk '{print $1}')

if [ -z "$IFACE" ]; then
    echo "No network interface with address: '$MAC_ADDR'" >&2
    exit 1
fi

cat > /etc/sysconfig/network-scripts/ifcfg-"$IFACE" << EOF
BOOTPROTO=dhcp
DEVICE=$IFACE
HWADDR=$MAC_ADDR
ONBOOT=yes
TYPE=Ethernet
USERCTL=no
DEFROUTE=no
PEERDNS=no
EOF

ifup "$IFACE"

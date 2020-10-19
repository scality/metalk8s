#!/bin/bash

set -xue -o pipefail

IFACE=$1

MAC_ADDR="$(cat "/sys/class/net/$IFACE/address")"
OUTPUT_FILE="/etc/sysconfig/network-scripts/ifcfg-$IFACE"

cat > "$OUTPUT_FILE" << EOF
BOOTPROTO=dhcp
DEVICE=$IFACE
HWADDR=$MAC_ADDR
ONBOOT=yes
TYPE=Ethernet
USERCTL=no
DEFROUTE=no
PEERDNS=no
EOF

ifup $IFACE

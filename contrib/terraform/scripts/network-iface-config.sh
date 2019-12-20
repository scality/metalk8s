#!/bin/bash
# This script needs to be replaced by a cloud-init script

declare -r IFACE=$1

if [ ! -f /sys/class/net/"$IFACE"/address ]; then
    echo "No such network interface '$IFACE'"
    exit 1
fi

read -r MAC_ADDR < /sys/class/net/"$IFACE"/address

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

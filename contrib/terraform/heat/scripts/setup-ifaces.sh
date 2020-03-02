#!/bin/bash

for iface in "eth1" "eth2"; do
    mac_addr=$(cat /sys/class/net/$iface/address)
    if [ -z "$mac_addr" ]; then
        echo "No network interface with name: '$iface'" >&2
        exit 1
    fi

    cat > /etc/sysconfig/network-scripts/ifcfg-"$iface" << EOF
BOOTPROTO=dhcp
DEVICE=$iface
HWADDR=$mac_addr
ONBOOT=yes
TYPE=Ethernet
USERCTL=no
DEFROUTE=no
PEERDNS=no
EOF

    ifup "$iface"
done

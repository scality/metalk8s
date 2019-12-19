#!/usr/bin/env bash

# This script is simply a loop for retrying the `dhclient` calls in order to
# successfully obtain IP addresses for the internal interfaces `eth1` and `eth2`
# NOTE: must be run with admin privileges

set -xue -o pipefail

# Defaults
MAX_RETRY=10
INTERFACES=(
    eth1
    eth2
)

# Functions
request_ip() {
    dhclient -r "$1" && dhclient "$1"
}

check_ip() {
    ip addr show "$1" | grep "inet\b" | awk '{print $2}' | cut -d/ -f1
}


# Main procedure

# Disable IPv6
for iface in all default eth0 lo; do
    sysctl -w net.ipv6.conf.$iface.disable_ipv6=1
done

# Protect /etc/resolv.conf from being updated by the dhclient
chattr +i /etc/resolv.conf

# Then, loop over interfaces and retry the dhclient call until an address is
# found
for ifname in "${INTERFACES[@]}"; do
    echo "$ifname"
    for _ in $(seq 1 $MAX_RETRY); do
        request_ip "$ifname"
        sleep 1s
        if [ "$(check_ip "$ifname")" ]; then
            echo "Found IP address for $ifname"
            break
        fi
    done
done

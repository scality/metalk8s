#!/bin/bash
#
# Make a node resolve names through the bastion, and dnf go through its proxy.
#
# Usage: node.sh <bastion IP>

set -euo pipefail

bastion_ip=$1
nm_conf=/etc/NetworkManager/conf.d/90-offline-dns.conf

# cloud-init writes the resolvers at the very end of the boot
cloud-init status --wait > /dev/null || true

# NetworkManager would otherwise write the resolvers back
if [ -d "$(dirname "$nm_conf")" ] \
    && ! printf '[main]\ndns=none\n' | cmp -s - "$nm_conf"; then
    printf '[main]\ndns=none\n' > "$nm_conf"
    systemctl try-reload-or-restart NetworkManager
fi

if [ -L /etc/resolv.conf ] \
    || ! echo "nameserver $bastion_ip" | cmp -s - /etc/resolv.conf; then
    rm -f /etc/resolv.conf
    echo "nameserver $bastion_ip" > /etc/resolv.conf
    restorecon /etc/resolv.conf
fi

# The MetalK8s repositories opt out of it
if ! grep -q '^proxy=' /etc/dnf/dnf.conf; then
    sed -i "/^\[main\]/a proxy=http://$bastion_ip:3128" /etc/dnf/dnf.conf
fi

# Fail here rather than halfway through the installation. Only an OS
# repository is refreshed, the MetalK8s ones may be down by now.
getent hosts google.com > /dev/null
dnf -q makecache --refresh --repo baseos

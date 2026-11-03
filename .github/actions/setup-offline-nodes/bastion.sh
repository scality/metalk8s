#!/bin/bash
#
# Serve the nodes DNS and a proxy for dnf from the bastion.
#
# Usage: bastion.sh <bastion IP the nodes reach>

set -euo pipefail

bastion_ip=$1

cloud-init status --wait > /dev/null || true

dnf install -y -q squid dnsmasq

# Never cached, so that dnf never gets stale repository metadata
cat > /etc/squid/squid.conf << EOF
http_port $bastion_ip:3128
acl nodes src 172.30.100.0/24 172.30.200.0/24
http_access allow nodes
http_access deny all
cache deny all
EOF

# Forwards to the resolvers of the bastion
cat > /etc/dnsmasq.conf << EOF
listen-address=$bastion_ip
bind-interfaces
no-hosts
EOF

if systemctl is-active -q firewalld; then
    firewall-cmd -q --add-service=dns --add-service=squid
fi
systemctl enable -q squid dnsmasq
systemctl restart squid dnsmasq

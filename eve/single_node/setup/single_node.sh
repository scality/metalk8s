#!/usr/bin/env bash

set -euo pipefail

truncate -s 20G /var/lib/kube_lvm
losetup /dev/loop0 /var/lib/kube_lvm
systemctl disable --now iptables
systemctl disable --now ip6tables
iptables -F
iptables -X

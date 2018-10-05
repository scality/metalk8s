die() {
    exit 1
}

echo "Creating loopback block-device and configuring VM"
truncate -s 128G /kube-lvm1 || die
losetup /dev/loop0 /kube-lvm1 || die
truncate -s 128G /kube-lvm2 || die
losetup /dev/loop1 /kube-lvm2 || die

echo "Disabling iptables"
if systemctl is-enabled --quiet iptables; then
  systemctl disable --now iptables || die
  systemctl disable --now ip6tables || die
fi
iptables -F || die
iptables -X || die

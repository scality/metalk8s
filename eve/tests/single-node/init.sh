die() {
    exit 1
}

echo "Creating loopback block-device and configuring VM"
truncate -s 256G /kube-lvm || die
losetup /dev/loop0 /kube-lvm || die

echo "Disabling iptables"
if systemctl is-enabled --quiet iptables; then
  systemctl disable --now iptables || die
  systemctl disable --now ip6tables || die
fi
iptables -F || die
iptables -X || die

yum install -y epel-release
yum install -y python36 python36-devel
pip3 install tox

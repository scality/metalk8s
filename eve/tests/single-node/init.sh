die() {
    exit 1
}

echo "Creating loopback block-device and configuring VM"
sudo truncate -s 256G /kube-lvm || die
sudo losetup /dev/loop0 /kube-lvm || die

echo "Disabling iptables"
if systemctl is-enabled --quiet iptables; then
  sudo systemctl disable --now iptables || die
  sudo systemctl disable --now ip6tables || die
fi
sudo iptables -F || die
sudo iptables -X || die

sudo yum install -y epel-release
sudo yum install -y python2-pip python2-devel python36 python36-devel
sudo pip2 install tox

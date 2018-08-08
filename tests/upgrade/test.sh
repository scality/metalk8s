BASE_VERSION=b642f7383b1647e646e6809483142fece8fc456e

top_srcdir="$(realpath "$(pwd)/../..")"

ANSIBLE_FORCE_COLOR=true
export ANSIBLE_FORCE_COLOR

make_shell() {
        make --no-print-directory -C "${top_srcdir}" shell C="$*"
}

die() {
        exit 1
}

git_describe() {
        git describe --all --tags --long --dirty --always
}

setup_suite() {
        echo "Installing dependencies"
        sudo yum install -y \
                patch \
                || die

        echo "Creating loopback block-device and configuring VM"
        sudo truncate -s 20G /kube-lvm || die
        sudo losetup /dev/loop0 /kube-lvm || die

        echo "Disabling iptables"
        sudo systemctl disable --now iptables || die
        sudo systemctl disable --now ip6tables || die
        sudo iptables -F || die
        sudo iptables -X || die
}

test_setup_baseline_version() {
        TEST_DIR=$(pwd)
        cd ../.. || die
        git clone . /tmp/metal-k8s || die
        cd /tmp/metal-k8s || die
        git checkout "${BASE_VERSION}" || die
        # We need to apply this patch for `make shell` to work with this 'old'
        # version of MetalK8s
        patch -p1 < "${TEST_DIR}/make-shell-interactive.patch" || die
        git_describe
        echo "Deploy the cluster"
        # Note: not using `make_shell`, because that one uses `-C` to go in the
        # `srcdir`, whilst we *want* to be in `/tmp/metal-k8s`, which is the
        # 'old' version we want to deploy.
        make shell C="ansible-playbook -i \"${TEST_DIR}/inventory\" metal-k8s.yml --skip elasticsearch"
        assert_equals 0 $? "ansible-playbook failed"
}

test_upgrade_to_head_version() {
        git_describe
        echo "Upgrade the cluster"
        make_shell ansible-playbook -i "$(pwd)/inventory" metal-k8s.yml --skip elasticsearch
        assert_equals 0 $? "ansible-playbook failed"
}

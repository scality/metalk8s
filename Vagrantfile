# -*- mode: ruby -*-
# vi: set ft=ruby ts=2 sw=2 expandtab :
# frozen_string_literal: true

IMPORT_RELEASE = <<-SCRIPT
#!/bin/bash

set -eu -o pipefail

RC=0

source /vagrant/_build/root/product.txt

die() {
    echo 1>&2 $@
    exit 1
}

echo "Installing build artifacts on the host"

mkdir -p /srv/scality || die "Failed to create /srv/scality"
rm -f "/srv/scality/metalk8s-$SHORT_VERSION" || die "Failed to unlink symlink destination"
ln -s /vagrant/_build/root "/srv/scality/metalk8s-$SHORT_VERSION" || die "Failed to create symlink"

echo "Installed build artifacts on the host"

echo "Disabling swap"
swapoff -a
echo "Swap disabled"

exit $RC
SCRIPT

BOOTSTRAP = <<-SCRIPT
#!/bin/bash

set -eu -o pipefail

source /vagrant/_build/root/product.txt

if ! test -x "/srv/scality/metalk8s-$SHORT_VERSION/bootstrap.sh"; then
    echo 1>&2 "Bootstrap script not found in build directory."
    echo 1>&2 "Did you run 'make'?"
    exit 1
fi

echo "Creating bootstrap configuration"
mkdir -p /etc/metalk8s
cat > /etc/metalk8s/bootstrap.yaml << EOF
apiVersion: metalk8s.scality.com/v1alpha1
kind: BootstrapConfiguration
networks:
  controlPlane: 10.0.0.0/8
  workloadPlane: 10.0.0.0/8
EOF

echo "Launching bootstrap"
exec "/srv/scality/metalk8s-$SHORT_VERSION/bootstrap.sh"
SCRIPT

NETWORK_RANGE = "192.168.42."
BOOTSTRAP_IP_OFFSET = 10

# To support VirtualBox linked clones
Vagrant.require_version(">= 1.8")

Vagrant.configure("2") do |config|
  config.vm.box = "centos/7"
  config.vm.box_version = "1811.02"

  config.vm.provider "virtualbox" do |v|
    v.linked_clone = true
    v.memory = 2048
    v.cpus = 2
  end

  config.vm.define :bootstrap, primary: true do |bootstrap|
    bootstrap.vm.hostname = "bootstrap"

    bootstrap_ip = "#{NETWORK_RANGE}#{BOOTSTRAP_IP_OFFSET}"
    bootstrap.vm.network "private_network", ip: bootstrap_ip

    bootstrap.vm.provider "virtualbox" do |v|
      v.memory = 4096
      bootstrap.vm.synced_folder ".", "/vagrant", type: "virtualbox"
    end

    bootstrap.vm.provision "import-release",
      type: "shell",
      inline: IMPORT_RELEASE

    bootstrap.vm.provision "bootstrap",
      type: "shell",
      inline: BOOTSTRAP
  end

  (1..9).each do |i|
    node_name = "node#{i}"
    node_ip = "#{NETWORK_RANGE}#{BOOTSTRAP_IP_OFFSET+i}"

    config.vm.define node_name, autostart: false do |node|
      node.vm.hostname = node_name

      node.vm.network "private_network", ip: node_ip

      node.vm.synced_folder ".", "/vagrant", disabled: true

      # No need for Guest Additions since there is no synced folder
      node.vbguest.auto_update = false
    end
  end
end

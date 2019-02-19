# -*- mode: ruby -*-
# vi: set ft=ruby ts=2 sw=2 expandtab :
# frozen_string_literal: true

IMPORT_RELEASE = <<-SCRIPT
#!/bin/bash

set -eu -o pipefail

RC=0

die() {
    echo 1>&2 $@
    exit 1
}

echo "Installing build artifacts on the host"

mkdir -p /srv/scality || die "Failed to create /srv/scality"
rm -f /srv/scality/metalk8s-dev || die "Failed to unlink symlink destination"
ln -s /vagrant/_build/root /srv/scality/metalk8s-dev || die "Failed to create symlink"

echo "Installed build artifacts on the host"

echo "Disabling swap"
swapoff -a
echo "Swap disabled"

exit $RC
SCRIPT

BOOTSTRAP = <<-SCRIPT
#!/bin/bash

set -eu -o pipefail

if ! test -x /srv/scality/metalk8s-dev/bootstrap.sh; then
    echo 1>&2 "Bootstrap script not found in build directory."
    echo 1>&2 "Did you run 'make'?"
    exit 1
fi

echo "Launching bootstrap"
exec /srv/scality/metalk8s-dev/bootstrap.sh
SCRIPT

# To support VirtualBox linked clones
Vagrant.require_version(">= 1.8")

Vagrant.configure("2") do |config|
  config.vm.define :bootstrap do |bootstrap|
    bootstrap.vm.box = "centos/7"
    bootstrap.vm.box_version = "1811.02"
    bootstrap.vm.hostname = "bootstrap"

    bootstrap.vm.provider "virtualbox" do |v|
      v.linked_clone = true
      v.memory = 2048
      v.cpus = 2

      bootstrap.vm.synced_folder ".", "/vagrant", type: "virtualbox"
    end

    bootstrap.vm.provision "import-release",
      type: "shell",
      inline: IMPORT_RELEASE

    bootstrap.vm.provision "bootstrap",
      type: "shell",
      inline: BOOTSTRAP
  end
end

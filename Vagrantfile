# -*- mode: ruby -*-
# vi: set ft=ruby ts=2 sw=2 expandtab :
# frozen_string_literal: true

IMPORT_RELEASE = <<-SCRIPT
#!/bin/bash

set -eu -o pipefail

RC=0

echo "Installing build artifacts on the host"

# This script is supposed to 'install' the build results on the system,
# i.e. symlink something like `/vagrant/_build/root` to
# `/srv/scality/metalk8s-$VERSION` or however we build this.

echo "Installed build artifacts on the host"

exit $RC
SCRIPT

BOOTSTRAP = <<-SCRIPT
#!/bin/bash

set -eu -o pipefail

RC=0

echo "Launching bootstrap"

# This script is supposed to launch the bootstrap process. If this process is
# already scripted in something provisioned in `/srv/scality/metalk8s-$VERSION`,
# then we could just chain/`exec` into that one.

echo "Bootstrap finished"

exit $RC
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

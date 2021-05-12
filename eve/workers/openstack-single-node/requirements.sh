#!/bin/bash

## Dependencies ##

yum install -y epel-release
curl -sL https://rpm.nodesource.com/setup_10.x | bash -

PACKAGES=(
    curl
    git
    python36-pip
    xorg-x11-server-Xvfb
    gtk2
    libXtst*
    libXScrnSaver*
    GConf2*
    alsa-lib*
    gcc-c++
    make
    nodejs
    isomd5sum
    skopeo
)

yum install -y "${PACKAGES[@]}"

yum clean all

sudo -u eve pip3.6 install --user tox


## Configuration ##

# Set salt minion_id before lauching the bootstrap to not use the hostname as
# minion id and kubernetes kubernetes node name
mkdir -p /etc/salt
echo "bootstrap" > /etc/salt/minion_id

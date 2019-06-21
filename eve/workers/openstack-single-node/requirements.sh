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
)

yum install -y "${PACKAGES[@]}"

yum clean all

sudo -u eve pip3.6 install --user tox


## Configuration ##

HOSTNAME=bootstrap

# This step is needed so Kubelet registration doesn't fail for DNS entries
# longer than 63 characters.
hostnamectl set-hostname $HOSTNAME

# Make sure Salt Minion ID is set to this same hostname
mkdir -p /etc/salt
echo $HOSTNAME > /etc/salt/minion_id

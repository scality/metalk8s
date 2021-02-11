#!/bin/bash

yum install -y epel-release

PACKAGES=(
    curl
    git
    jq
    make
    python36-pip
    unzip
)

yum install -y "${PACKAGES[@]}"

yum clean all

sudo -u eve python3.6 -m pip install --user --upgrade pip
sudo -u eve python3.6 -m pip install --user tox python-openstackclient

sudo -u eve mkdir -p /home/eve/.ssh/
sudo -u eve ssh-keygen -t rsa -b 4096 -N '' -f /home/eve/.ssh/terraform

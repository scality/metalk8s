#!/bin/bash

declare -a YUM_OPTS=(
    --assumeyes
    --setopt 'skip_missing_names_on_install=False'
)

declare -a PACKAGES=(
    curl
    git
    make
    python36-pip
    unzip
)

yum install "${YUM_OPTS[@]}" epel-release

yum install "${YUM_OPTS[@]}" "${PACKAGES[@]}"

yum clean all

sudo -u eve pip3.6 install --user tox

sudo -u eve mkdir -p /home/eve/.ssh/
sudo -u eve ssh-keygen -t rsa -b 4096 -N '' -f /home/eve/.ssh/terraform

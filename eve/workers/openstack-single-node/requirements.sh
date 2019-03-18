#!/bin/bash

yum install -y epel-release

PACKAGES=(
    curl
    git
    python34-pip
)

yum install -y "${PACKAGES[@]}"

yum clean all

pip3 install tox

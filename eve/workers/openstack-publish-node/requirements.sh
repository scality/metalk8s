#!/bin/bash

PACKAGES=(
    curl
#    docker-ce-cli
    isomd5sum
    skopeo
)

#yum-config-manager --add-repo \
#    https://download.docker.com/linux/centos/docker-ce.repo

yum install --assumeyes --setopt=skip_missing_names_on_install=False \
    "${PACKAGES[@]}"

yum clean all

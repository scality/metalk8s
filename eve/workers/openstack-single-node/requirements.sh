#!/bin/bash

PACKAGES=(
    curl
    git
)

yum install -y "${PACKAGES[@]}"

yum clean all

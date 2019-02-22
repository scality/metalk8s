#!/bin/bash

PACKAGES=(
    curl
)

yum install -y "${PACKAGES[@]}"

yum clean all

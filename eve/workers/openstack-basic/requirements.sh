#!/bin/bash

## Dependencies ##

PACKAGES=(
    isomd5sum
)

yum install -y "${PACKAGES[@]}"

yum clean all

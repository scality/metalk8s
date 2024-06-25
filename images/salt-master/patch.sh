#!/bin/bash

patch_salt() {
    declare -a PATCH_FILES=(
        states/x509_v2.py
    )
    for pfile in "${PATCH_FILES[@]}"; do
        mkdir -p "/tmp/$(dirname "$pfile")"
        curl -Lo "/tmp/$pfile" "https://github.com/saltstack/salt/raw/3006.x/salt/$pfile"
        cp "/tmp/$pfile" "/opt/saltstack/salt/lib/python3.10/site-packages/salt/$pfile"
    done
}

patch_salt

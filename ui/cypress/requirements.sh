#!/bin/bash

# This script is designed to run on RHEL/Rocky with `sudo` installed
# Mainly used in the CI

if ! [ -f /etc/redhat-release ]; then
    echo "Only RedHat family dists are supported" 1>&2
    exit 1
fi

set -xue -o pipefail

DNF_OPTS=(
    --assumeyes
)
NPM_OPTS=(
    --no-save
    --quiet
    --no-package-lock
)
RPM_PACKAGES=(
    alsa-lib
    gtk3
    libXtst
    libXScrnSaver
    nodejs
    xorg-x11-server-Xvfb
)
NODE_PACKAGES=(
    har-validator@5.1.5
    cypress@13.17.0
    cypress-wait-until@3.0.2
    @testing-library/cypress@10.0.0
    querystring@0.2.1
)

curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -

# NOTE: We have to set the crypto policies to SHA1 because of the
#       outdated version of nodejs
sudo update-crypto-policies --set DEFAULT:SHA1

sudo dnf install "${DNF_OPTS[@]}" "${RPM_PACKAGES[@]}"

sudo update-crypto-policies --set DEFAULT

npm install "${NPM_OPTS[@]}" "${NODE_PACKAGES[@]}"

sudo ln -s "$PWD/node_modules/cypress/bin/cypress" /usr/local/bin/cypress

sudo chown root:root "$HOME/.cache/Cypress/13.17.0/Cypress/chrome-sandbox"
sudo chmod 4755 "$HOME/.cache/Cypress/13.17.0/Cypress/chrome-sandbox"

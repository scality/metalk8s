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
# Keep in sync with ui/package.json
CYPRESS_VERSION=16.3.0
# Cypress 16 requires Node.js 22 or later
NODEJS_STREAM=22

RPM_PACKAGES=(
    alsa-lib
    gtk3
    libXtst
    libXScrnSaver
    nodejs
    npm
    xorg-x11-server-Xvfb
)
NODE_PACKAGES=(
    har-validator@5.1.5
    "cypress@${CYPRESS_VERSION}"
    cypress-wait-until@3.0.2
    @testing-library/cypress@10.1.3
    querystring@0.2.1
)

sudo dnf module enable "${DNF_OPTS[@]}" "nodejs:${NODEJS_STREAM}"

sudo dnf install "${DNF_OPTS[@]}" "${RPM_PACKAGES[@]}"

npm install "${NPM_OPTS[@]}" "${NODE_PACKAGES[@]}"

sudo ln -s "$PWD/node_modules/cypress/bin/cypress" /usr/local/bin/cypress

sudo chown root:root "$HOME/.cache/Cypress/${CYPRESS_VERSION}/Cypress/chrome-sandbox"
sudo chmod 4755 "$HOME/.cache/Cypress/${CYPRESS_VERSION}/Cypress/chrome-sandbox"

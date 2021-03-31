#!/bin/bash

# This script is designed to run on RHEL/CentOS with `sudo` installed
# Mainly used in the CI

if ! [ -f /etc/redhat-release ]; then
    echo "Only RedHat family dists are supported" 1>&2
    exit 1
fi

set -xue -o pipefail

YUM_OPTS=(
    --assumeyes
    --setopt 'skip_missing_names_on_install=False'
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
    cypress@5.6.0
    cypress-cucumber-preprocessor@4.0.0
    cypress-wait-until@1.7.1
    @testing-library/cypress@7.0.3
)

curl -sL https://rpm.nodesource.com/setup_14.x | sudo bash -

sudo yum install "${YUM_OPTS[@]}" "${RPM_PACKAGES[@]}"

npm install "${NPM_OPTS[@]}" "${NODE_PACKAGES[@]}"

sudo ln -s "$PWD/node_modules/cypress/bin/cypress" /usr/local/bin/cypress

sudo chown root:root "$HOME/.cache/Cypress/5.6.0/Cypress/chrome-sandbox"
sudo chmod 4755 "$HOME/.cache/Cypress/5.6.0/Cypress/chrome-sandbox"

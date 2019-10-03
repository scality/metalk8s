#!/usr/bin/env bash

# On single node CONTROL_PLANE_IP = eth0
CONTROL_PLANE_IP=$(ip a show eth0 | grep -Po "inet \K[\d.]+")

# The version of Cypress we install below requires GTK3 to be available
test -n "${IN_CI}" && sudo yum install -y gtk3

CYPRESS_INSTALL_BINARY="https://cdn.cypress.io/beta/binary/3.5.0/linux-x64/circle-develop-053b6bd993f8016171f1f7b8148840d2c0d37716-158387/cypress.zip"
export CYPRESS_INSTALL_BINARY
CYPRESS_INSTALL_PACKAGE="https://cdn.cypress.io/beta/npm/3.5.0/circle-develop-053b6bd993f8016171f1f7b8148840d2c0d37716-158400/cypress.tgz"

npm install --no-save --quiet --no-package-lock "${CYPRESS_INSTALL_PACKAGE}" cypress-cucumber-preprocessor@1.12.0

test -n "${IN_CI}" && \
    sudo chown root:root /home/eve/.cache/Cypress/3.5.0/Cypress/chrome-sandbox && \
    sudo chmod 4755 /home/eve/.cache/Cypress/3.5.0/Cypress/chrome-sandbox && \
    unset http_proxy HTTP_PROXY \
          https_proxy HTTPS_PROXY \
          no_proxy NO_PROXY

npm run test:e2e -- -e target_url="https://${CONTROL_PLANE_IP}:8443"

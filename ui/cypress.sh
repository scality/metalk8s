#!/usr/bin/env bash

# On single node CONTROL_PLANE_IP = eth0
CONTROL_PLANE_IP=$(ip a show eth0 | grep -Po "inet \K[\d.]+")

# The version of Cypress we install below requires GTK3 to be available
test -n "${IN_CI}" && sudo yum install -y gtk3

npm install --no-save --quiet --no-package-lock cypress@3.5.0 cypress-cucumber-preprocessor@1.12.0 cypress-wait-until@1.6.0

test -n "${IN_CI}" && \
    sudo chown root:root /home/eve/.cache/Cypress/3.5.0/Cypress/chrome-sandbox && \
    sudo chmod 4755 /home/eve/.cache/Cypress/3.5.0/Cypress/chrome-sandbox && \
    unset http_proxy HTTP_PROXY \
          https_proxy HTTPS_PROXY \
          no_proxy NO_PROXY

npm run test:e2e -- -e target_url="https://${CONTROL_PLANE_IP}:8443"

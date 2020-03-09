#!/usr/bin/env bash

[[ "${IN_CI,,}" =~ ^(true)|(yes)|1$ ]] && IN_CI=true || IN_CI=''

# On single node CONTROL_PLANE_IP = eth0
CONTROL_PLANE_IP=$(/usr/sbin/ip a show eth0 | grep -Po "inet \K[\d.]+")

if [[ $IN_CI ]]; then
    # The version of Cypress we install below requires GTK3 to be available
    packages=(
        gtk3
        xorg-x11-server-Xvfb
        libXtst*
        libXScrnSaver*
        GConf2*
        alsa-lib*
        gcc-c++
        make
        nodejs
    )
    curl -sL https://rpm.nodesource.com/setup_10.x | sudo -E bash -
    sudo yum install -y epel-release
    sudo yum install -y "${packages[@]}"
fi

npm install --no-save --quiet --no-package-lock cypress@3.5.0 \
    cypress-cucumber-preprocessor@1.12.0 cypress-wait-until@1.6.0

test -n "${IN_CI}" && \
    sudo chown root:root /home/"$USER"/.cache/Cypress/3.5.0/Cypress/chrome-sandbox && \
    sudo chmod 4755 /home/"$USER"/.cache/Cypress/3.5.0/Cypress/chrome-sandbox && \
    unset http_proxy HTTP_PROXY \
          https_proxy HTTPS_PROXY \
          no_proxy NO_PROXY

npm run test:e2e -- -e target_url="https://${CONTROL_PLANE_IP}:8443"

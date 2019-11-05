#!/bin/bash

declare -r RHSM_USERNAME=$1
           RHSM_PASSWORD=$2

subscription-manager register --username "$RHSM_USERNAME" \
    --password "$RHSM_PASSWORD" --auto-attach
subscription-manager repos --enable=rhel-7-server-extras-rpms \
    --enable=rhel-7-server-optional-rpms

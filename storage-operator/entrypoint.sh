#!/bin/sh

set -e
set -u

operator-sdk build "$1"
chown -R "${TARGET_UID}:${TARGET_GID}" /storage-operator/build/_output

#!/bin/bash

set -e
set -u
set -o pipefail

tox --workdir /tmp/tox -e docs -- "$@" 1>&2
chown -R "${TARGET_UID}:${TARGET_GID}" /usr/src/metalk8s/docs/_build

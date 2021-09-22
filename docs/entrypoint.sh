#!/bin/bash

BUILD_DIR=${BUILD_DIR:-/usr/src/metalk8s/docs/_build}

change_build_ownership() {
    chown -R "${TARGET_UID:-}:${TARGET_GID:-}" "$BUILD_DIR"
}

trap change_build_ownership EXIT

tox --workdir /tmp/tox -e docs -- "$@"

#!/bin/bash

BUILD_DIR=${BUILD_DIR:-/usr/src/metalk8s/docs/_build}

change_build_ownership() {
    chown -R "${TARGET_UID:-}:${TARGET_GID:-}" "$BUILD_DIR"
}

trap change_build_ownership EXIT

for font in tctt0900 tcit0900; do
    mktexpk --destdir "$BUILD_DIR/latex/.texlive2019/texmf-var/fonts/pk/ljfour/jknappen/ec/" \
        --mfmode / --bdpi 600 --mag 1+0/600 --dpi 600 "$font"
done

tox --workdir /tmp/tox -e docs -- "$@"

#!/bin/bash

set -eu

build() {
    # Redirect everything to stderr, to get as much info as possible in case
    # of an error.
    npm run build 1>&2
}

clean() {
    rm -rf /home/node/build
}

case ${1:- } in
    build)
        build
        ;;
    clean)
        clean
        ;;
    '')
        exec /bin/bash
        ;;
    *)
        exec "$@"
        ;;
esac

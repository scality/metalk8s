#!/bin/bash

set -eu

build() {
    npm run build
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

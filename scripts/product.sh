#!/bin/bash

set -e
set -u
set -o pipefail

cat << EOF
NAME=MetalK8s
VERSION=${VERSION_MAJOR}.${VERSION_MINOR}.${VERSION_PATCH}${VERSION_SUFFIX}
SHORT_VERSION=${VERSION_MAJOR}.${VERSION_MINOR}
GIT=$(git describe --long --always --tags --dirty)
DEVELOPMENT_RELEASE=$(test "x${VERSION_SUFFIX}" = 'x-dev' && echo 1 || echo 0)
BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BUILD_HOST=$(hostname)
EOF

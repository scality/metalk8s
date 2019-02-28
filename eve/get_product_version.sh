#!/bin/bash

script_full_path=$(readlink -f "$0")
file_dir=$(dirname "$script_full_path")/..
# shellcheck disable=SC1090
source "$file_dir/VERSION" && \
    echo "${VERSION_MAJOR}.${VERSION_MINOR}.${VERSION_PATCH}${VERSION_SUFFIX}"


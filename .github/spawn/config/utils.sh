#!/bin/bash

die() {
    echo "${1:-"An error occured"}" >&2
    exit 1
}

check_context() {
    if [[ -z "$GITHUB_ENV" ]]; then
        die "Must run in a GitHub Actions runner ('GITHUB_ENV' is unset)"
    fi
}

check_env() {
    if [[ -z "${!1}" ]]; then
        die "Must define the environment variable '$1'"
    fi
}

set_gh_env() {
    local -r name="$1" value="$2"

    echo "$name=$value" >> "$GITHUB_ENV"
}

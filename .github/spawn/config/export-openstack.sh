#!/bin/bash

# shellcheck disable=SC1090,SC1091
source ./utils.sh

check_context

check_env AUTH_URL
set_gh_env OS_AUTH_URL "$AUTH_URL"

check_env REGION
set_gh_env OS_REGION_NAME "$REGION"

check_env USERNAME
set_gh_env OS_USERNAME "$USERNAME"

check_env PASSWORD
set_gh_env OS_PASSWORD "$PASSWORD"

if [[ -n "$TENANT" ]]; then
    set_gh_env OS_TENANT_NAME "$TENANT"
fi

set_gh_env OS_PROJECT_DOMAIN_ID "${PROJECT_DOMAIN:-"default"}"
set_gh_env OS_USER_DOMAIN_ID "${USER_DOMAIN:-"default"}"

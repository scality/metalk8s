#!/bin/bash

set -xue -o pipefail

# This should be set from `%(prop:artifacts_name)s`
ARTIFACTS_NAME=${ARTIFACTS_NAME:-}
# Removes the build ID to get any other build matching the commit / stage
COMMON_NAME=${ARTIFACTS_NAME%.*}


get_last_artifact_url() {
    local -r kind=${1:-"latest"}

    curl -Ls --fail -I \
        -o /dev/null \
        -w "%{url_effective}\n" \
        http://artifacts/$kind/$COMMON_NAME \
        > .last_artifacts_url
}

# Try to get the last successful build attempt
if get_last_artifact_url "last_success"; then
    echo "A successful build already exists for $COMMON_NAME - see:"
    cat .last_artifacts_url
    echo -n "SUCCESSFUL" > .last_final_status
    exit 0
else
    echo "No successful build for $COMMON_NAME"
    rm .last_artifacts_url
fi

# Try to get the last failed build attempt
if get_last_artifact_url "last_failure"; then
    echo "Last failed build for $COMMON_NAME exists - see:"
    cat .last_artifacts_url
    echo -n "FAILED" > .last_final_status
else
    echo "No failed build for $COMMON_NAME"
    rm .last_artifacts_url
fi

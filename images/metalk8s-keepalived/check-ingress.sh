#!/bin/bash

set -xue -o pipefail

TIMEOUT=2

curl --insecure --silent --max-time "$TIMEOUT" \
    --output /dev/null --show-error --fail \
    "https://127.0.0.1:443/healthz"

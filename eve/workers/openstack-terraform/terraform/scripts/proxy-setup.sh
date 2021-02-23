#!/bin/bash

set -euo pipefail

PROXY_HOST=${1:-}
PROXY_PORT=${2:-3128}
PROXY_URL=http://$PROXY_HOST:$PROXY_PORT
PROXY_CA_URL=https://eve.devsca.com/vault/v1/release_engineering_root_CA_prod/cert/ca
PROXY_CA_PATH=/etc/pki/ca-trust/source/anchors/scality_internal_ca.crt


if ! [[ $PROXY_HOST ]]; then
    echo "No proxy host provided, exiting"
    exit
fi

if ! [ -f /etc/redhat-release ]; then
    echo "The proxy script only handle RedHat family dists."
    exit 1
fi

curl -skx "$PROXY_URL" -L "$PROXY_CA_URL" \
    | sed -e 's/.*"certificate":"\(.*\)","revocation_time".*/\1/' \
          -e 's/\\n/\n/g' \
    > "$PROXY_CA_PATH"

update-ca-trust force-enable
update-ca-trust extract

yum-config-manager --save --setopt proxy="$PROXY_URL"

#!/bin/bash

set -xue -o pipefail

if test -x /etc/keepalived/keepalived.conf.sh; then
        KEEPALIVED_CONF=/var/run/keepalived.conf
        /etc/keepalived/keepalived.conf.sh "${KEEPALIVED_CONF}"
else
        KEEPALIVED_CONF=/etc/keepalived/keepalived.conf
fi

test -f "${KEEPALIVED_CONF}"

exec keepalived --use-file "${KEEPALIVED_CONF}" "$@"

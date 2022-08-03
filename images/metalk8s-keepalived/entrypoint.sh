#!/bin/bash

set -xue -o pipefail

/generate-config.py --input "$1" --template "/etc/keepalived/keepalived.conf.j2" --output "/etc/keepalived/keepalived.conf"

exec keepalived \
    --log-console --log-detail \
    --dont-fork --dont-respawn \
    --address-monitoring \
    --dump-conf --use-file "/etc/keepalived/keepalived.conf"

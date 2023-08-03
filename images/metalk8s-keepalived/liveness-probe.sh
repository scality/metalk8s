#!/bin/bash

set -xue -o pipefail

# Simple check to ensure that the config does not need to be updated
/generate-config.py --input /etc/keepalived/keepalived-input.yaml --template /etc/keepalived/keepalived.conf.j2 | diff -qw /etc/keepalived/keepalived.conf -
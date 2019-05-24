#!/bin/sh

set -ue

python3 /static-container-registry.py /var/lib/images > /var/run/static-container-registry.conf

exec "$@"

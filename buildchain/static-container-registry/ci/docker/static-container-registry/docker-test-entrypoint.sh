#!/bin/sh

set -ue

printf "Waiting for images to be pulled..." 1>&2
while [ ! -f /var/lib/images/.pulled ]; do
    sleep 0.5
done
echo " done" 1>&2

exec /entrypoint.sh nginx -g 'daemon off;'

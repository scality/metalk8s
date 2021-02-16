#!/bin/sh
# vim:sw=4:ts=4:et
set -x
CONFIG=$(sed -e ':a;N;$!ba;s/\n/ /g' /etc/metalk8s/shell-ui/config.json | sed -e 's/"/\\\\"/g')
sed -i "s#%CONFIG%#${CONFIG}#g" "$(pwd)"/shell/solution-ui-navbar.*.js

/docker-entrypoint.sh "$@"

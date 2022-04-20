#!/bin/bash

BUILD_DIR=${BUILD_DIR:-/usr/src/metalk8s/docs/_build}
TARGET_UID=${TARGET_UID:-$(id -u)}
TARGET_GID=${TARGET_GID:-$(id -g)}

# If we are in docker user and group does not exists so create them
if ! grep -q "$TARGET_UID" /etc/passwd; then
  if ! grep -q "$TARGET_GID" /etc/group; then
    groupadd -g "$TARGET_GID" tempgroup
  fi
  useradd -u "$TARGET_UID" -g "$TARGET_GID" tempuser
fi

sudo chown -R "$TARGET_UID:$TARGET_GID" /tmp/tox
sudo -u "$(id -u -n "$TARGET_UID")" -E tox --workdir /tmp/tox -e docs -- "$@"

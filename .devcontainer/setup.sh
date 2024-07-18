#!/bin/bash

set -xe

if [ "$CODESPACES" = "true" ]; then
  # NOTE: This is the only way I managed to have the right
  # permissions files for git sources files
  # (Some salt pylint test check file permissions and expected 644
  # instead of the default 666 from codespaces)
  echo "Updating git file permissions"
  sudo setfacl -bnR .
  git rm -qrf .
  git reset --hard HEAD
fi

# NOTE: Due to a bug in recent babel version, it cannot work with
# default UTC timezone
# See: https://github.com/python-babel/babel/issues/990
echo "Updating localtime"
sudo ln -fs /usr/share/zoneinfo/UTC /etc/localtime

echo "Install pre-commit hooks"
pre-commit install

echo "End of setup"

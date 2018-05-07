#!/bin/bash

set -x
set -u
set -e

# Remove unused locales
localedef --list-archive | grep -a -v en_US.utf8 | xargs localedef --delete-from-archive
cp /usr/lib/locale/locale-archive{,.tmpl}
build-locale-archive

# Clean Yum cache etc
yum clean -y all

# Make sure all leftover space is TRIM'ed
dd if=/dev/zero of=/EMPTY bs=1M || true
rm -f /EMPTY
sync

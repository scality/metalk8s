#!/bin/bash

set -x
set -u
set -e

yum clean -y all

dd if=/dev/zero of=/EMPTY bs=1M || true
rm -f /EMPTY
sync

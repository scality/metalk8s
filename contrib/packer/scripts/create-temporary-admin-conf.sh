#!/bin/bash

set -e
set -u
set -x

cp /etc/kubernetes/admin.conf /home/vagrant/temporary-admin.conf
chown vagrant:vagrant /home/vagrant/temporary-admin.conf

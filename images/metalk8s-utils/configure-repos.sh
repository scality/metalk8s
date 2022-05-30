#!/bin/bash

set -xue -o pipefail

CENTOS_VERSION=$1
SALT_VERSION=$2

cat > /etc/yum.repos.d/kubernetes.repo << EOF
[kubernetes]
name=Kubernetes
baseurl=https://packages.cloud.google.com/yum/repos/kubernetes-el$CENTOS_VERSION-x86_64
enabled=1
gpgcheck=1
repo_gpgcheck=0
gpgkey=https://packages.cloud.google.com/yum/doc/yum-key.gpg
       https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg
EOF

cat > /etc/yum.repos.d/saltstack.repo << EOF
[saltstack]
name=SaltStack repo for RHEL/CentOS \$releasever
baseurl=https://repo.saltproject.io/py3/redhat/\$releasever/\$basearch/archive/$SALT_VERSION
enabled=1
gpgcheck=1
gpgkey=https://repo.saltproject.io/py3/redhat/\$releasever/\$basearch/archive/$SALT_VERSION/SALTSTACK-GPG-KEY.pub
EOF

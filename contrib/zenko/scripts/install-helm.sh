#!/bin/bash

echo "Installing Helm"

source /run/metalk8s/scripts/activate-proxy &> /dev/null

mkdir -p /tmp/zenko

echo "Downloading Helm binaries"
curl -o /tmp/zenko/helm.tar.gz https://get.helm.sh/helm-v2.16.3-linux-amd64.tar.gz
curl -o /tmp/zenko/helm.sha256 https://get.helm.sh/helm-v2.16.3-linux-amd64.tar.gz.sha256
echo "$(</tmp/zenko/helm.sha256) /tmp/zenko/helm.tar.gz" | sha256sum -c

echo "Install 'helm' binary"
tar -C helm -xzvf helm.tar.gz
cp helm/linux-amd64/helm /usr/sbin


export KUBECONFIG=/etc/kubernetes/admin.conf

echo "Initialize Helm in the cluster"
kubectl create namespace helm
helm init \
    --node-selectors node-role.kubernetes.io/infra= \
    --override spec.tolerations="node-role.kubernetes.io/infra" \
    --tiller-namespace helm

deactivate-proxy &> /dev/null

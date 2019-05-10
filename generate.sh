#!/bin/bash -ue

ROOT=$(pwd)
PODMAN=$(command -v podman)

HELM_IMAGE=docker.io/alpine/helm:2.13.1

echo "#!jinja | kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes"
echo

${PODMAN} run --rm \
    -v ${ROOT}/charts/metallb:/chart:ro,Z \
    -v ${ROOT}/charts/metallb.yaml:/values.yaml:ro,Z \
    "${HELM_IMAGE}" \
    template \
    --name metalk8s-metallb \
    --namespace metalk8s \
    --values /values.yaml \
    /chart | \
    \
    python fixup-labels.py

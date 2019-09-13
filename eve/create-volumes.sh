#!/bin/bash

# Note: this script's *defaults* must adhere to the Vagrant environment in
# which it is used.

set -eu -o pipefail

BOOTSTRAP_NODE_NAME=${BOOTSTRAP_NODE_NAME:-$(hostname)}
PRODUCT_TXT=${PRODUCT_TXT:-/vagrant/_build/root/product.txt}

# shellcheck disable=SC1090
source "${PRODUCT_TXT}"

PRODUCT_MOUNT=${PRODUCT_MOUNT:-/srv/scality/metalk8s-${VERSION}}

if ! test -f "${PRODUCT_MOUNT}/examples/prometheus-sparse.yaml"; then
    echo 1>&2 "Storage provisioning template not found."
    exit 1
fi

KUBECONFIG=${KUBECONFIG:-/etc/kubernetes/admin.conf}
export KUBECONFIG

echo "Creating storage volumes"
sed "s/BOOTSTRAP_NODE_NAME/${BOOTSTRAP_NODE_NAME}/" "${PRODUCT_MOUNT}/examples/prometheus-sparse.yaml" | \
    kubectl apply -f -

OK=0
echo "Waiting for PV 'bootstrap-alertmanager' to be provisioned"
for _ in $(seq 1 60); do
    if kubectl get pv bootstrap-alertmanager > /dev/null 2>&1; then
        OK=1
        break
    fi
    sleep 1
done
[ $OK -eq 1 ] || (echo "PV not created"; false)

OK=0
echo "Waiting for PV 'bootstrap-prometheus' to be provisioned"
for _ in $(seq 1 60); do
    if kubectl get pv bootstrap-prometheus > /dev/null 2>&1; then
        OK=1
        break
    fi
    sleep 1
done
[ $OK -eq 1 ] || (echo "PV not created"; false)

OK=0
echo 'Waiting for AlertManager to be running'
for _ in $(seq 1 60); do
    PHASE=$(kubectl -n metalk8s-monitoring get pod alertmanager-prometheus-operator-alertmanager-0 -o jsonpath="{.status.phase}")
    if [ "x${PHASE}" = "xRunning" ]; then
        OK=1
        break
    fi
    sleep 1
done
[ $OK -eq 1 ] || (echo "AlertManager not Running"; false)

OK=0
echo 'Waiting for Prometheus to be running'
for _ in $(seq 1 60); do
    PHASE=$(kubectl -n metalk8s-monitoring get pod prometheus-prometheus-operator-prometheus-0 -o jsonpath="{.status.phase}")
    if [ "x${PHASE}" = "xRunning" ]; then
        OK=1
        break
    fi
    sleep 1
done
[ $OK -eq 1 ] || (echo "Prometheus not Running"; false)

#!/bin/bash

# Note: this script's *defaults* must adhere to the Vagrant environment in
# which it is used.

set -eu -o pipefail

retry() {
    local -ri max_tries=$1
    local -i try=1

    shift
    until "$@"; do
        [ $try -lt "$max_tries" ] || return 1
        (( ++try ))
        sleep 1
    done
}

check_pv_exists() {
    local -r pv_name=$1

    kubectl get pv "$pv_name" &> /dev/null
}

check_pod_is_in_phase() {
    local -r namespace=$1
    local -r pod_name=$2
    local -r expected_phase=$3
    local phase

    phase=$(
        kubectl -n "$namespace" get pod "$pod_name" \
            -o 'jsonpath={.status.phase}' 2> /dev/null
    )

    [[ $phase = "$expected_phase" ]]
}

NODE_NAME=${NODE_NAME:-$(salt-call --local --out txt grains.get id | cut -c 8-)}
PRODUCT_TXT=${PRODUCT_TXT:-/vagrant/_build/root/product.txt}
LOKI_ENABLED=${LOKI_ENABLED:-true}
MAX_TRIES=300

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
sed "s/NODE_NAME/${NODE_NAME}/" \
    "${PRODUCT_MOUNT}/examples/prometheus-sparse.yaml" | \
    kubectl apply -f -
sed "s/NODE_NAME/${NODE_NAME}/" \
    "${PRODUCT_MOUNT}/examples/loki-sparse.yaml" | \
    kubectl apply -f -

wait_for_pv() {
    local -r pv="$1"

    echo "Waiting for PV '$pv' to be provisioned"
    if ! retry "$MAX_TRIES" check_pv_exists "$pv"; then
        echo "PV '$pv' not created"
        kubectl logs -n kube-system deploy/storage-operator
        exit 1
    fi
}

wait_for_pv "$NODE_NAME-alertmanager"
wait_for_pv "$NODE_NAME-prometheus"
wait_for_pv "$NODE_NAME-loki"

wait_for_pod() {
    local -r name="$1" namespace="$2" pod="$3"

    echo "Waiting for $name to be running"
    if ! retry "$MAX_TRIES" check_pod_is_in_phase "$namespace" "$pod" Running
    then
        echo "$name is not Running"
        kubectl describe pod -n "$namespace" "$pod"
        exit 1
    fi
}

wait_for_pod "AlertManager" \
    metalk8s-monitoring alertmanager-prometheus-operator-alertmanager-0
wait_for_pod "Prometheus" \
    metalk8s-monitoring prometheus-prometheus-operator-prometheus-0
if [ "$LOKI_ENABLED" = "true" ]; then
    wait_for_pod "Loki" \
        metalk8s-logging loki-0
fi

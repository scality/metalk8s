#!/bin/bash

KUBECONFIG=${KUBECONFIG:-/etc/kubernetes/admin.conf}
STATUS=Running
NAMESPACE=

declare -i RETRY=30 \
           SLEEP_TIME=5 \
           STABILIZATION_TIME=30

LONG_OPTS=stabilization-time:,kubeconfig:,namespace:,retry:,sleep-time:,status:
SHORT_OPTS=k:n:r:s:S:t:

if ! options=$(getopt --options "$SHORT_OPTS" --long "$LONG_OPTS" -- "$@"); then
    echo "Incorrect arguments provided" 1>&2
    exit 1
fi

eval set -- "$options"

while :; do
    case $1 in
        -k|--kubeconfig)
            KUBECONFIG=$2
            shift
            ;;
        -n|--namespace)
            NAMESPACE=--namespace=$2
            shift
            ;;
        -r|--retry)
            RETRY=$2
            shift
            ;;
        -s|--status)
            STATUS=$2
            shift
            ;;
        -S|--stabilization-time)
            STABILIZATION_TIME=$2
            shift
            ;;
        -t|--sleep-time)
            SLEEP_TIME=$2
            shift
            ;;
        --)
            shift
            break
            ;;
        *)
            echo "Option parsing failure" 1>&2
            exit 1
            ;;
    esac
    shift
done

[[ $NAMESPACE ]] || NAMESPACE=--all-namespaces

check_pods_status() {
    kubectl get pods "$NAMESPACE" \
        --field-selector="status.phase!=$STATUS" \
        --kubeconfig="$KUBECONFIG" \
        2>&1 | grep -q 'No resources found'
}

check_pods_stabilization() {
    [ -z "$(
        timeout "$STABILIZATION_TIME" kubectl get pods "$NAMESPACE" \
            --field-selector="status.phase!=$STATUS" \
            --kubeconfig="$KUBECONFIG" \
            --watch-only
    )" ]
}

check_pods_presence() {
    ! kubectl get pods "$NAMESPACE" \
        --kubeconfig="$KUBECONFIG" \
        2>&1 | grep -q 'No resources found'
}

check_kubeconfig() {
    if [ ! -r "$KUBECONFIG" ]; then
        if [ -f "$KUBECONFIG" ]; then
            echo "Unable to read $KUBECONFIG, check you have sufficient"
                 "rights or try to launch this script using sudo." 2>&1
        else
            echo "No such file: $KUBECONFIG" 2>&1
        fi
        return 1
    fi
    return 0
}

check_kubeconfig || exit 1

if ! check_pods_presence; then
    echo "No pod found" 2>&1
    exit 1
fi

for ((try = 0; try <= RETRY; ++try)); do
    if check_pods_status; then
        echo "All pods are $STATUS ! Now waiting $STABILIZATION_TIME" \
             "seconds for pods to be stabilized..."
        if check_pods_stabilization; then
            echo "All pods are $STATUS and stabilized."
            exit 0
        fi
        echo "All pods are not stabilized yet."
    fi
    echo "Waiting for pods to be $STATUS..."
    sleep "$SLEEP_TIME"
done

echo "Pods are still not $STATUS after $RETRY retries in" \
     "$SECONDS seconds!"

kubectl get pods "$NAMESPACE" \
    --field-selector="status.phase!=$STATUS" \
    --kubeconfig="$KUBECONFIG"

exit 1

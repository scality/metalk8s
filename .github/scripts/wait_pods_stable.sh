#!/bin/bash

KUBECONFIG=${KUBECONFIG:-/etc/kubernetes/admin.conf}

declare -i RETRY=30 \
           SLEEP_TIME=5 \
           STABILIZATION_TIME=30

LONG_OPTS=stabilization-time:,kubeconfig:,retry:,sleep-time:
SHORT_OPTS=k:r:s:t:

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
        -r|--retry)
            RETRY=$2
            shift
            ;;
        -s|--stabilization-time)
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

check_pods_stabilization() {
    [ -z "$(
        timeout "$STABILIZATION_TIME" kubectl get pods --all-namespaces \
            --kubeconfig="$KUBECONFIG" \
            --watch-only 2>&1
    )" ]
}

check_kubeconfig() {
    if [ ! -r "$KUBECONFIG" ]; then
        if [ -f "$KUBECONFIG" ]; then
            echo "Unable to read $KUBECONFIG, check you have sufficient" \
                 "rights or try to launch this script using sudo." 2>&1
        else
            echo "No such file: $KUBECONFIG" 2>&1
        fi
        return 1
    fi
    return 0
}

check_kubeconfig || exit 1

for ((try = 0; try <= RETRY; ++try)); do
    if check_pods_stabilization; then
        echo "All pods are stabilized."
        exit 0
    fi
    echo "Waiting for pods to stabilize..."
    sleep "$SLEEP_TIME"
done

echo "Pods are still not stable after $RETRY retries in" \
     "$SECONDS seconds!"

kubectl get pods --all-namespaces --kubeconfig="$KUBECONFIG"

exit 1

#!/bin/bash

KUBECTL_VERSION=1.10.1
KUBECTL_SHA1SUM=a5c8e589bed21ec471e8c582885a8c9972a84da1
HELM_VERSION=2.8.2
HELM_TAR_SHA1SUM=e1fa06313e5e5e60bfadceb34304d43f407615a7
HELM_SHA1SUM=be2ba42acd80637313b7e58d12eddaf6ef1aac73

set -u
set -e
set -o pipefail

ENV_BIN_DIR=$1
shift
test -n "${ENV_BIN_DIR}"

if [ -e "${ENV_BIN_DIR}/kubectl" ]; then
    CURR=$(sha1sum "${ENV_BIN_DIR}/kubectl" | awk '{print $1}')
    if [ "${CURR}" != "${KUBECTL_SHA1SUM}" ]; then
        echo "Unexpected kubectl binary, removing..."
        rm -f "${ENV_BIN_DIR}/kubectl"
    fi
fi

if [ -e "${ENV_BIN_DIR}/helm" ]; then
    CURR=$(sha1sum "${ENV_BIN_DIR}/helm" | awk '{print $1}')
    if [ "${CURR}" != "${HELM_SHA1SUM}" ]; then
        echo "Unexpected helm binary, removing..."
        rm -f "${ENV_BIN_DIR}/helm"
    fi
fi


if [ ! -x "${ENV_BIN_DIR}/kubectl" ]; then
    echo "kubectl not installed, downloading..."
    KUBECTL_TMP="$(mktemp)"
    curl -s -L -o "${KUBECTL_TMP}" \
        "https://storage.googleapis.com/kubernetes-release/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
    sha1sum -c > /dev/null << EOF
${KUBECTL_SHA1SUM}  ${KUBECTL_TMP}
EOF
    chmod a+x "${KUBECTL_TMP}"
    mv "${KUBECTL_TMP}" "${ENV_BIN_DIR}/kubectl"
fi

if [ ! -x "${ENV_BIN_DIR}/helm" ]; then
    echo "helm not installed, downloading..."
    HELM_TAR_TMP="$(mktemp)"
    curl -s -L -o "${HELM_TAR_TMP}" \
        "https://storage.googleapis.com/kubernetes-helm/helm-v${HELM_VERSION}-linux-amd64.tar.gz"
    sha1sum -c > /dev/null << EOF
${HELM_TAR_SHA1SUM}  ${HELM_TAR_TMP}
EOF
    HELM_TMP="$(mktemp -d)"
    tar -xzf "${HELM_TAR_TMP}" -C "${HELM_TMP}" linux-amd64/helm
    rm -f "${HELM_TAR_TMP}"
    sha1sum -c > /dev/null << EOF
${HELM_SHA1SUM}  ${HELM_TMP}/linux-amd64/helm
EOF
    chmod a+x "${HELM_TMP}/linux-amd64/helm"
    mv "${HELM_TMP}/linux-amd64/helm" "${ENV_BIN_DIR}/helm"
    rm -rf "${HELM_TMP}"
fi

exec "${SHELL:-bash}" "$@"

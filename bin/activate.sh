#!/bin/sh

KUBECTL_BINARY="bin/kubectl"
HELM_BINARY="bin/helm"

LOCAL_CLIENT_PLAYBOOK="$(pwd)/local_client.yml"
PASSWORD_FILE="$(pwd)/kubespray/credentials/kube_user"
METAL_K8S_KUBECONFIG="$(pwd)/kubespray/artifacts/admin.conf"

ANSIBLE_REMOVE_WARNING="-i localhost, -c local"
ANSIBLE_TAGS=

if [ ! -f "${KUBECTL_BINARY}" ]; then
    ANSIBLE_TAGS="${ANSIBLE_TAGS},kubectl"
fi
if [ ! -f "${HELM_BINARY}" ]; then
    ANSIBLE_TAGS="${ANSIBLE_TAGS},helm"
fi

if [ ! -z "${ANSIBLE_TAGS}" ]; then
    ansible-playbook ${ANSIBLE_REMOVE_WARNING} ${LOCAL_CLIENT_PLAYBOOK} -t ${ANSIBLE_TAGS}
fi

kube_pass () {
    cat ${PASSWORD_FILE}
}

deactivate () {
    if ! [ -z "${_OLD_VIRTUAL_PS1+_}" ] ; then
        PS1="${_OLD_VIRTUAL_PS1}"
        export PS1
        unset _OLD_VIRTUAL_PS1
    fi
    PATH="${_OLD_VIRTUAL_PATH}"
    export PATH
    unset _OLD_VIRTUAL_PATH
    unset -f kube_pass
    unset -f deactivate
}

_OLD_VIRTUAL_PS1="${PS1}"
_OLD_VIRTUAL_PATH="${PATH}"


export KUBECONFIG="${METAL_K8S_KUBECONFIG}"
export PATH="$(pwd)/bin/:${PATH}"
source <(kubectl completion $(basename ${SHELL})) || true
source <(helm completion $(basename ${SHELL})) || true
export PS1="(metal-k8s) ${PS1}"

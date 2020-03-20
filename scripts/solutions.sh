#!/bin/bash

set -euo pipefail

KUBECONFIG=${KUBECONFIG:-/etc/kubernetes/admin.conf}
SALT_CALL=${SALT_CALL:-salt-call}
NAMESPACE_REGEX='^[a-z0-9]([-a-z0-9]*[a-z0-9])?$'
ENV_ANNOTATION=solutions.metalk8s.scality.com/environment-description
ENV_LABEL=solutions.metalk8s.scality.com/environment
ENV_CONFIGMAP=metalk8s-environment
SOLUTIONS_NAMESPACE=metalk8s-solutions
SOLUTIONS_CONFIGMAP=metalk8s-solutions

ARCHIVES=()
DESCRIPTION=''
LOGFILE=/var/log/metalk8s/solutions.log
NAME=''
NAMESPACE=''
SOLUTION=''
VERBOSE=${VERBOSE:-0}
VERSION=''

declare -A COMMANDS=(
    [import]=import_solution
    [unimport]=unimport_solution
    [activate]=activate_solution
    [deactivate]=deactivate_solution
    [create-env]=create_environment
    [delete-env]=delete_environment
    [add-solution]=add_solution
    [delete-solution]=delete_solution
)
declare -A COMMAND_MANDATORY_OPTIONS=(
    [import]='--archive'
    [unimport]='--archive'
    [activate]='--name'
    [deactivate]='--name'
    [create-env]='--name'
    [delete-env]='--name'
    [add-solution]='--name --solution --version'
    [delete-solution]='--name --solution'
)
declare -A OPTIONS_MAPPING=(
    [--archive]=ARCHIVES
    [--description]=DESCRIPTION
    [--name]=NAME
    [--namespace]=NAMESPACE
    [--solution]=SOLUTION
    [--version]=VERSION
)

usage() {
    SCRIPT_NAME=${BASH_SOURCE[0]##*/}

    echo "Usage: $SCRIPT_NAME COMMAND [OPTIONS]"
    echo
    echo "Commands:"
    echo "  activate            Deploy a Solution components (CRDs)"
    echo "    -n, --name          Name of the Solution to deploy"
    echo "    -V, --version       Version of the Solution to deploy"
    echo "                        (optional, default to latest)"
    echo
    echo "  deactivate          Remove a Solution components (CRDs)"
    echo "    -n, --name          Name of the Solution to delete"
    echo
    echo "  import              Import a Solution archive"
    echo "    -a, --archive       Path to the Solution archive to import,"
    echo "                        option can be provided multiple times"
    echo
    echo "  unimport            Unimport a Solution archive"
    echo "    -a, --archive       Path to the Solution archive to unimport,"
    echo "                        option can be provided multiple times"
    echo
    echo "  create-env          Create a new Environment"
    echo "    -d, --description   Description of the Environment (optional)"
    echo "    -n, --name          Name of the Environment to create"
    echo "    -N, --namespace     Name of the Namespace to create inside"
    echo "                        the Environment (optional, default to the"
    echo "                        Environment name)"
    echo
    echo "  delete-env          Delete an Environment"
    echo "    -n, --name          Name of the Environment to delete"
    echo "    -N, --namespace     Name of the Namespace to delete from"
    echo "                        the Environment (optional, if not provided,"
    echo "                        removes all Namespaces in the Environment)"
    echo
    echo "  add-solution        Add a Solution in an Environment"
    echo "    -n, --name          Name of the Environment to add the Solution"
    echo "                        in"
    echo "    -N, --namespace     Namespace to add the Solution in (optional,"
    echo "                        if not provided default to the Environment"
    echo "                        name)"
    echo "    -s, --solution      Name of the Solution to add"
    echo "    -V, --version       Version of the Solution to add"
    echo
    echo "  delete-solution     Delete a Solution from an Environment"
    echo "    -n, --name          Name of the Environment to delete the"
    echo "                        Solution from"
    echo "    -N, --namespace     Namespace to delete the Solution from"
    echo "                        (optional, if not provided default to the"
    echo "                        Environment name)"
    echo "    -s, --solution      Name of the Solution to delete"
    echo
    echo "General options:"
    echo "  -h, --help          Display this message and exit"
    echo "  -l, --log-file      File to write logs (default: $LOGFILE)"
    echo "  -v, --verbose       Show commands launched, for debugging purposes"
}

check_namespace_validity() {
    [[ ${1:-} =~ $NAMESPACE_REGEX ]]
}

LONG_OPTS='
    archive:,
    description:,
    help,
    log-file:,
    name:,
    namespace:,
    solution:,
    verbose,
    version:
'
SHORT_OPTS='a:d:hl:n:N:s:vV:'

if ! options=$(getopt --options "$SHORT_OPTS" --long "$LONG_OPTS" -- "$@"); then
    echo 1>&2 "Incorrect arguments provided"
    usage
    exit 1
fi

eval set -- "$options"

while :; do
    case $1 in
        -a|--archive)
            shift
            ARCHIVES+=("$(readlink -f "$1")")
            ;;
        -d|--description)
            shift
            DESCRIPTION=$1
            ;;
        -h|--help)
            usage
            exit
            ;;
        -l|--log-file)
            shift
            LOGFILE=$1
            ;;
        -n|--name)
            shift
            NAME=$1
            ;;
        -N|--namespace)
            shift
            NAMESPACE=$1
            if ! check_namespace_validity "$NAMESPACE"; then
                echo 1>&2 "Namespace name '$NAMESPACE' is invalid: it must" \
                    "consist of lower case alphanumeric characters or '-'," \
                    "and must start and end with an alphanumeric character."
                exit 1
            fi
            ;;
        -s|--solution)
            shift
            SOLUTION=$1
            ;;
        -v|--verbose)
            VERBOSE=1
            ;;
        -V|--version)
            shift
            VERSION=$1
            ;;
        --)
            shift
            break
            ;;
        *)
            echo 1>&2 "Option parsing failure"
            exit 1
            ;;
    esac
    shift
done

TMPFILES=$(mktemp -d)

mkdir -p "$(dirname "$LOGFILE")"

exec > >(tee -ia "$LOGFILE") 2>&1

cleanup() {
    rm -rf "$TMPFILES" || true
}

trap cleanup EXIT

BASE_DIR=$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")
# shellcheck disable=SC1090
. "$BASE_DIR"/common.sh

check_command_mandatory_options() {
    local -a missing_options=()
    local -r command=$1

    for option in ${COMMAND_MANDATORY_OPTIONS[$command]:-}; do
        [[ ${!OPTIONS_MAPPING[$option]:-} ]] || missing_options+=("$option")
    done

    if (( ${#missing_options[@]} )); then
        echo 1>&2 "Missing options for command '$command':" \
                  "${missing_options[@]}"
        return 1
    fi

    return 0
}

salt_minion_exec() {
    salt-call "$@" --retcode-passthrough
}

salt_master_exec() {
    SALTENV=${SALTENV:-$(get_salt_env)}
    SALT_MASTER_CONTAINER_ID=${SALT_MASTER_CONTAINER_ID:-$(get_salt_container)}
    crictl exec -i "$SALT_MASTER_CONTAINER_ID" "$@" saltenv="$SALTENV"
}

activate_solution() {
    run "Updating Solutions configuration file" \
        salt_minion_exec metalk8s_solutions.activate_solution \
        solution="$NAME" \
        version="${VERSION:-latest}" \
        --local

    run "Deploying Solution components" \
        salt_master_exec salt-run state.orchestrate \
        metalk8s.orchestrate.solutions.deploy-components \
        pillar="{'bootstrap_id': '$(get_salt_minion_id)'}"
}

deactivate_solution() {
    run "Updating Solutions configuration file" \
        salt_minion_exec metalk8s_solutions.deactivate_solution \
        solution="$NAME" \
        --local

    run "Removing Solution components" \
        salt_master_exec salt-run state.orchestrate \
        metalk8s.orchestrate.solutions.deploy-components \
        pillar="{'bootstrap_id': '$(get_salt_minion_id)'}"
}

configure_archives() {
    local removed=${1:-False}

    for archive in "${ARCHIVES[@]}"; do
        if file "$archive" | grep -vq 'ISO 9660'; then
            echo "File '$archive' is not an ISO archive" 1>&2
            return 1
        fi

        salt_minion_exec metalk8s_solutions.configure_archive \
            archive="$archive" \
            removed="$removed" \
            create_config=True \
            --local || return
    done

    salt_minion_exec saltutil.refresh_pillar
}

import_solution() {
    SALTENV=${SALTENV:-$(get_salt_env)}

    run "Updating Solutions configuration file" configure_archives
    run "Importing Solutions" \
        salt_minion_exec state.sls metalk8s.solutions.available \
        saltenv="$SALTENV"
    run "Configuring Metalk8s registry" \
        salt_minion_exec state.sls metalk8s.repo.installed \
        saltenv="$SALTENV"
}

unimport_solution() {
    SALTENV=${SALTENV:-$(get_salt_env)}

    run "Updating Solutions configuration file" configure_archives True
    run "Unimporting Solutions" \
        salt_minion_exec state.sls metalk8s.solutions.available \
        saltenv="$SALTENV"
    run "Configuring Metalk8s registry" \
        salt_minion_exec state.sls metalk8s.repo.installed \
        saltenv="$SALTENV"
}

namespace_is_in_environment() {
    local -r namespace=$1 environment=$2

    kubectl get namespace --selector="$ENV_LABEL=$environment" \
        --output=jsonpath='{ .items[*].metadata.name }' \
        | grep --quiet --word-regexp "$namespace"
}

check_namespace() {
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        echo 1>&2 "Namespace '$NAMESPACE' does not exist"
        return 1
    fi

    if ! namespace_is_in_environment "$NAMESPACE" "$NAME" &> /dev/null; then
        echo 1>&2 "Namespace '$NAMESPACE' is not linked to the"
            "Environment '$NAME'"
        return 1
    fi
}

create_environment() {
    if ! [[ ${NAMESPACE:-} ]]; then
        NAMESPACE=$NAME
        if ! check_namespace_validity "$NAMESPACE"; then
            echo 1>&2 "Environment name '$NAME' can't be used as a Namespace" \
                "name. Please provide a Namespace name using the --namespace" \
                "option, which only contains lower case alphanumeric" \
                "characters or '-', and starts and ends with an alphanumeric" \
                "character."
                return 1
        fi
    fi

    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        echo 1>&2 "Namespace '$NAMESPACE' already exists"
        return 1
    fi

    run "Creating Namespace '$NAMESPACE'" \
        kubectl create namespace "$NAMESPACE"
    run "Adding Namespace '$NAMESPACE' to Environment '$NAME'" \
        kubectl label namespace "$NAMESPACE" "$ENV_LABEL=$NAME"
    run "Setting Namespace '$NAMESPACE' description" \
        kubectl annotate namespace "$NAMESPACE" \
        "$ENV_ANNOTATION=${DESCRIPTION:-}"
    run "Creating Namespace '$NAMESPACE' configuration" \
        kubectl create configmap "$ENV_CONFIGMAP" \
        --namespace "$NAMESPACE"
}

delete_namespaces() {
    for namespace; do
        run "Deleting Namespace '$namespace'" \
            kubectl delete namespace "$namespace"
    done
}

delete_environment() {
    local -a namespaces=()

    if ! [[ ${NAMESPACE:-} ]]; then
        read -ra namespaces <<< "$(
            kubectl get namespace \
            --selector="$ENV_LABEL=$NAME" \
            --output=jsonpath='{ .items[*].metadata.name }'
        )"
        if ! (( ${#namespaces[@]} )); then
            echo 1>&2 "No such Environment '$NAME'"
            return 1
        fi
    else
        check_namespace || return
        namespaces=("$NAMESPACE")
    fi

    delete_namespaces "${namespaces[@]}"
}

check_solution_version_exists() {
    local -r version=$1 solution_data=$2
    local -ra python_script=(
        "import json, sys;"
        "available = any(v.get('version') == sys.argv[1] for v in"
        "json.loads(sys.argv[2]));"
        "sys.exit(0 if available else 1);"
    )

    python -c "${python_script[*]}" "$version" "$solution_data"
}

check_solution_exists() {
    local solution_data

    solution_data=$(
        kubectl get configmap "$SOLUTIONS_CONFIGMAP" \
            --namespace "$SOLUTIONS_NAMESPACE" \
            --output=jsonpath="{ .data['$SOLUTION'] }"
    )

    if ! [[ "$solution_data" ]]; then
        echo 1>&2 "Solution '$SOLUTION' is not deployed"
        return 1
    fi

    if ! check_solution_version_exists "$VERSION" "$solution_data"; then
        echo 1>&2 "Version '$VERSION' of Solution '$SOLUTION' is not deployed"
        return 1
    fi
}

add_solution() {
    [[ ${NAMESPACE:-} ]] || NAMESPACE=$NAME

    check_namespace && check_solution_exists || return

    local -ra patch=(
        '{'
        '  "data": {'
        '    "'"$SOLUTION"'": "'"$VERSION"'"'
        '  }'
        '}'
    )

    run "Adding Solution '$SOLUTION:$VERSION'" \
        kubectl patch configmap "$ENV_CONFIGMAP" \
        --namespace "$NAMESPACE" \
        --patch "${patch[*]}"

    local -ra pillar=(
        "{"
        "  'orchestrate': {"
        "    'env_name': '$NAME'"
        "  }"
        "}"
    )

    run "Preparing Environment '$NAME'" \
        salt_master_exec salt-run state.orchestrate \
        metalk8s.orchestrate.solutions.prepare-environment \
        pillar="${pillar[*]}"
}

delete_solution() {
    [[ ${NAMESPACE:-} ]] || NAMESPACE=$NAME

    check_namespace || return

    if ! kubectl get configmap "$ENV_CONFIGMAP" \
          --namespace "$NAMESPACE" \
          --output=jsonpath="{.data.$SOLUTION}" \
          --allow-missing-template-keys=false &> /dev/null; then
        echo 1>&2 "Solution '$SOLUTION' is not configured in Namespace" \
            "'$NAMESPACE'"
        return 1
    fi

    local -ra patch=(
        "[{"
        "  'op': 'remove',"
        "  'path': '/data/$SOLUTION'"
        "}]"
    )

    run "Removing Solution '$SOLUTION'" \
        kubectl patch configmap "$ENV_CONFIGMAP" \
        --namespace "$NAMESPACE" \
        --type json \
        --patch "${patch[*]}"

    local -ra pillar=(
        "{"
        "  'orchestrate': {"
        "    'env_name': '$NAME'"
        "  }"
        "}"
    )

    run "Preparing Environment '$NAME'" \
        salt_master_exec salt-run state.orchestrate \
        metalk8s.orchestrate.solutions.prepare-environment \
        pillar="${pillar[*]}"
}

if ! (( $# )); then
    echo 1>&2 "You must provide one of the following commands as the" \
        "first positional argument: ${!COMMANDS[*]}"
    usage
    exit 1
fi

COMMAND=$1

if ! [[ ${COMMANDS[$COMMAND]:-} ]]; then
    echo 1>&2 "Command '$COMMAND' is invalid, please use one of:" \
        "${!COMMANDS[*]}"
    usage
    exit 1
fi

check_command_mandatory_options "$COMMAND" || exit

"${COMMANDS[$COMMAND]}"

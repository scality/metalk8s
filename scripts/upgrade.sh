#!/bin/bash
set -e
set -u
set -o pipefail

VERBOSE=${VERBOSE:-0}
LOGFILE=/var/log/metalk8s-upgrade.log
DRY_RUN=0
DESTINATION_VERSION=""
SALT_CALL=${SALT_CALL:-salt-call}


_usage() {
    echo "upgrade.sh [options]"
    echo "Options:"
    echo "--destination-version "
    echo "   <destination-version>:        Destination version to upgrade to"
    echo "-l/--log-file <logfile_path>:    Path to log file"
    echo "-v/--verbose:                    Run in verbose mode"
    echo "-d/--dry-run:                    Run actions in dry run mode"
    echo "-h/--help:                       Show this help menu"
}

while (( "$#" )); do
  case "$1" in
    -d|--dry-run)
      DRY_RUN=1
      shift
      ;;
    -v|--verbose)
      VERBOSE=1
      shift
      ;;
    --destination-version)
      DESTINATION_VERSION="$2"
      shift 2
      ;;
    -l|--log-file)
      LOGFILE="$2"
      shift 2
      ;;
    -h|--help)
      _usage
      exit
      ;;
    *) # unsupported flags
      echo "Error: Unsupported flag $1" >&2
      _usage
      exit 1
      ;;
  esac
done

TMPFILES=$(mktemp -d)

cat << EOF >> "${LOGFILE}"
--- MetalK8s Upgrade started on $(date -u -R) ---
EOF

exec > >(tee -ia "${LOGFILE}") 2>&1

cleanup() {
    rm -rf "${TMPFILES}" || true
}

trap cleanup EXIT


run_quiet() {
    local name=$1
    shift 1

    echo -n "> ${name}..."
    local start
    start=$(date +%s)
    set +e
    "$@" 2>&1 | tee -ia "${LOGFILE}" > "${TMPFILES}/out"
    local RC=$?
    set -e
    local end
    end=$(date +%s)

    local duration=$(( end - start ))

    if [ $RC -eq 0 ]; then
        echo " done [${duration}s]"
    else
        echo " fail [${duration}s]"
        cat >/dev/stderr << EOM

Failure while running step '${name}'

Command: $@

Output:

<< BEGIN >>
EOM
        cat "${TMPFILES}/out" > /dev/stderr

        cat >/dev/stderr << EOM
<< END >>

This script will now exit

EOM

        exit 1
    fi
}

run_verbose() {
    local name=$1
    shift 1

    echo "> ${name}..."
    "$@"
}

run() {
    if [ "$VERBOSE" -eq 1 ]; then
        run_verbose "${@}"
    else
        run_quiet "${@}"
    fi
}

die() {
    echo 1>&2 "$@"
    return 1
}

get_salt_container() {
    local -r max_retries=10
    local salt_container='' attempts=0

    while [ -z "$salt_container" ] && [ $attempts -lt $max_retries ]; do
        salt_container="$(crictl ps -q \
            --label io.kubernetes.pod.namespace=kube-system \
            --label io.kubernetes.container.name=salt-master \
            --state Running)"
        (( attempts++ ))
    done

    if [ -z "$salt_container" ]; then
        echo "Failed to find a running 'salt-master' container" >&2
        exit 1
    fi

    echo "$salt_container"
}

upgrade_bootstrap () {
    "${SALT_CALL}" --local state.sls metalk8s.roles.bootstrap saltenv="metalk8s-$DESTINATION_VERSION" \
        pillar="{'metalk8s': {'endpoints': $(salt-call --out txt pillar.get metalk8s:endpoints \
        | cut -c 8-)}}"
}

launch_upgrade () {
    SALT_MASTER_CALL=(crictl exec -i "$(get_salt_container)")

    "${SALT_MASTER_CALL[@]}" salt-run state.orchestrate metalk8s.orchestrate.upgrade saltenv="metalk8s-$DESTINATION_VERSION" \
        pillar="{'orchestrate': {'dest_version': '$DESTINATION_VERSION'}}"
}

precheck_upgrade() {
    if [ -z "$DESTINATION_VERSION" ]; then
        die "No destination version given"
    fi
    SALT_MASTER_CALL=(crictl exec -i "$(get_salt_container)")

    "${SALT_MASTER_CALL[@]}" salt-run state.orchestrate metalk8s.orchestrate.upgrade.precheck saltenv="metalk8s-$DESTINATION_VERSION" \
        pillar="{'orchestrate': {'dest_version': '$DESTINATION_VERSION'}}"
}

run "Performing Pre-Upgrade checks" precheck_upgrade
[ $DRY_RUN -eq 1 ] && exit 0
run "Upgrading bootstrap" upgrade_bootstrap
run "Launching the upgrade" launch_upgrade

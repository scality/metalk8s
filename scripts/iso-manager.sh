#!/bin/bash
set -e
set -u
set -o pipefail

BOOTSTRAP_CONFIG="/etc/metalk8s/bootstrap.yaml"
VERBOSE=${VERBOSE:-0}
LOGFILE="/var/log/metalk8s/iso-manager.log"
SALT_CALL=${SALT_CALL:-salt-call}
DRY_RUN="False"
SALTENV=""


_usage() {
    echo "iso-manager.sh [options]"
    echo "Options:"
    echo "-a/--archive <archive path>:     Path to archive folder or ISO"
    echo "-l/--log-file <logfile_path>:    Path to log file"
    echo "-v/--verbose:                    Run in verbose mode"
    echo "-d/--dry-run:                    Run actions in dry run mode"
}

ARCHIVES=()

while (( "$#" )); do
  case "$1" in
    -a|--archive)
      ARCHIVES+=("$2")
      shift 2
      ;;
    -d|--dry-run)
      DRY_RUN=True
      shift
      ;;
    -v|--verbose)
      VERBOSE=1
      shift
      ;;
    -l|--log-file)
      LOGFILE="$2"
      [ -z "$DEBUG" ] && DEBUG="on"
      shift 2
      ;;
    *) # unsupported flags
      echo "Error: Unsupported flag $1" >&2
      _usage
      exit 1
      ;;
  esac
done

TMPFILES=$(mktemp -d)

mkdir -p "$(dirname "${LOGFILE}")"

cat << EOF >> "${LOGFILE}"
--- MetalK8s ISO manager started on $(date -u -R) ---
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

# helper function to set the current saltenv
_set_env() {
    if [ -z "$SALTENV" ]; then
        SALTENV="metalk8s-$($SALT_CALL --out txt slsutil.renderer \
            string="{{ pillar.metalk8s.nodes[grains.id].version }}" \
            | cut -c 8-)"
    fi
}

# helper function to check for element in array
containsElement () {
  local element match="$1"
  shift
  for element in "$@"; do
      [[ "$element" == "$match" ]] && return 0;
  done
  return 1
}

_add_archives() {
    # Skip adding archive if None passed
    [ $# -lt 1 ] && return 0
    # Use salt file.serialize merge require having full list
    # salt-call output example:
    # local: ["/srv/scality/metalk8s-2.0.0/", "/tmp/metalk8s-2.1.0.iso"]
    # parsed archives:
    # ("/srv/scality/metalk8s-2.0.0/" "/tmp/metalk8s-2.1.0.iso")
    IFS=" " read -r -a \
        archives <<< "$(salt-call pillar.get metalk8s:archives \
        --out txt | cut -d' ' -f2- | tr -d '[],')"
    for archive in "$@"; do
        if ! containsElement "'$archive'" "${archives[@]}"; then
            archives+=("'$archive'")
        fi
    done
    echo "Collecting archives..."
    echo "${archives[@]}"
    # build archive list
    archive_list=${archives[0]}
    for i in "${archives[@]:1}"; do
        archive_list+=,$i
    done
    echo "Updating bootstrap.yaml"
    $SALT_CALL state.single file.serialize "$BOOTSTRAP_CONFIG" \
        dataset="{'archives': [$archive_list]}" \
        merge_if_exists=True \
        formatter=yaml \
        show_changes=True \
        test="$DRY_RUN" \
        --retcode-passthrough
    return $?
}

_configure_archives() {
    # Mount archives
    echo "Mounting archives..."
    $SALT_CALL state.sls metalk8s.archives.mounted \
        saltenv="$SALTENV" test=$DRY_RUN \
        --retcode-passthrough
    # Configure repos
    salt_envs=$(salt-call --out txt slsutil.renderer \
        string="{{ salt.metalk8s.get_archives().keys() | join(' ') }}" \
        | cut -d' ' -f2-)
    [[ -z $salt_envs ]] && die "Cannot detect archives envs"
    for salt_env in $salt_envs; do
        echo "Configuring archive $salt_env..."
        $SALT_CALL --local state.sls metalk8s.archives.configured \
            saltenv="$salt_env" \
            pillar="{'metalk8s': {'endpoints': \
            $(salt-call --out txt pillar.get metalk8s:endpoints | cut -c 8-)}}" \
            test="$DRY_RUN" \
            --retcode-passthrough
    done
    # Make the new version available
    echo "Making new versions available"
    $SALT_CALL state.sls metalk8s.archives saltenv="$SALTENV" test="$DRY_RUN" \
        --retcode-passthrough
}

# Main

_set_env
[ -z "$SALTENV" ] && die "saltenv not set"

run "Add archives" _add_archives ${ARCHIVES[@]+"${ARCHIVES[@]}"}
run "Configure archives" _configure_archives

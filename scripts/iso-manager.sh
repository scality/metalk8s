#!/bin/bash
set -e
set -u
set -o pipefail

VERBOSE=${VERBOSE:-0}
LOGFILE="/var/log/metalk8s/iso-manager.log"
SALT_CALL=${SALT_CALL:-salt-call}
DRY_RUN="False"
SALTENV=""


_usage() {
    echo "iso-manager.sh [options]"
    echo "Options:"
    echo "-a/--add-archive <archive path>:     Path to an archive folder or ISO to add"
    echo "-r/--rm-archive <archive path>:      Path to an archive folder or ISO to remove"
    echo "-l/--log-file <logfile_path>:        Path to log file"
    echo "-v/--verbose:                        Run in verbose mode"
    echo "-d/--dry-run:                        Run actions in dry run mode"
}

ARCHIVES_ADD=()
ARCHIVES_RM=()

while (( "$#" )); do
  case "$1" in
    -a|--add-archive)
      ARCHIVES_ADD+=("$(readlink -f "$2")")
      shift 2
      ;;
    -r|--rm-archive)
      ARCHIVES_RM+=("$(readlink -f "$2")")
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

BASE_DIR=$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")

# shellcheck disable=SC1090
. "$BASE_DIR"/common.sh

# helper function to set the current saltenv
_set_env() {
    if [ -z "$SALTENV" ]; then
        SALTENV="metalk8s-$($SALT_CALL --out txt slsutil.renderer \
            string="{{ pillar.metalk8s.nodes[grains.id].version }}" \
            | cut -c 8-)"
    fi
}

_add_archives() {
    for archive; do
        $SALT_CALL metalk8s.configure_archive "$archive"
    done
}

_remove_archives() {
    for archive; do
        $SALT_CALL metalk8s.configure_archive "$archive" remove=True
    done
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
            pillar="{ \
                'metalk8s': { \
                    'endpoints': \
                        $(salt-call --out txt pillar.get metalk8s:endpoints | cut -c 8-), \
                    'api_server': { \
                        'kubeconfig': '/etc/kubernetes/admin.conf' \
                    } \
                } \
            }" \
            test="$DRY_RUN" \
            --retcode-passthrough
    done
    # Make the new version available
    echo "Making new versions available"
    $SALT_CALL state.sls metalk8s.archives saltenv="$SALTENV" test="$DRY_RUN" \
        --retcode-passthrough
    # Unmount
    $SALT_CALL state.sls metalk8s.archives.unmounted test="$DRY_RUN" \
        --retcode-passthrough
}

_check_config() {
    # This call will fail if there is any invalid archive
    # configured in the bootstrap configuration file.
    $SALT_CALL metalk8s.get_archives
}

# Main

_set_env
[ -z "$SALTENV" ] && die "saltenv not set"

run "Check bootstrap configuration file" _check_config
if (( ${#ARCHIVES_ADD[@]} )); then
    run "Add archives" _add_archives "${ARCHIVES_ADD[@]}"
fi
if (( ${#ARCHIVES_RM[@]} )); then
    run "Remove archives" _remove_archives "${ARCHIVES_RM[@]}"
fi
run "Configure archives" _configure_archives

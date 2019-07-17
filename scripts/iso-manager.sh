#!/bin/bash
set -e
set -u
set -o pipefail

BOOTSTRAP_CONFIG="/etc/metalk8s/bootstrap.yaml"
VERBOSE=${VERBOSE:-0}
LOGFILE="/var/log/metalk8s-iso-manager.log"
SALT_CALL=${SALT_CALL:-salt-call}
DRY_RUN="False"
SALTENV=""


_usage() {
    echo "iso-manager.sh [options]"
    echo "Options:"
    echo "-p/--product <product path>:     Path to product folder or ISO"
    echo "-l/--log-file <logfile_path>:    Path to log file"
    echo "-v/--verbose:                    Run in verbose mode"
    echo "-d/--dry-run:                    Run actions in dry run mode"
}

PRODUCTS=()

while (( "$#" )); do
  case "$1" in
    -p|--product)
      PRODUCTS+=("$2")
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

_add_products() {
    # Skip adding product if None passed
    [ $# -lt 1 ] && return 0
    # Use salt file.serialize merge require having full list
    # salt-call output example:
    # local: ["/srv/scality/metalk8s-2.0.0/", "/tmp/metalk8s-2.1.0.iso"]
    # parsed products:
    # ("/srv/scality/metalk8s-2.0.0/" "/tmp/metalk8s-2.1.0.iso")
    IFS=" " read -r -a \
        products <<< "$(salt-call pillar.get metalk8s:products \
        --out txt | cut -d' ' -f2- | tr -d '[],')"
    for product in "$@"; do
        if ! containsElement "'$product'" "${products[@]}"; then
            products+=("'$product'")
        fi
    done
    echo "Collecting products..."
    echo "${products[@]}"
    # build product list
    product_list=${products[0]}
    for i in "${products[@]:1}"; do
        product_list+=,$i
    done
    echo "Updating bootstrap.yaml"
    $SALT_CALL state.single file.serialize "$BOOTSTRAP_CONFIG" \
        dataset="{'products': {'metalk8s': [$product_list]}}" \
        merge_if_exists=True \
        formatter=yaml \
        show_changes=True \
        test="$DRY_RUN" \
        --retcode-passthrough
    return $?
}

_configure_products() {
    # Mount products
    echo "Mounting products..."
    $SALT_CALL state.sls metalk8s.products.mounted \
        saltenv="$SALTENV" test=$DRY_RUN \
        --retcode-passthrough
    # Configure repos
    salt_envs=$(salt-call --out txt slsutil.renderer \
        string="{{ salt.metalk8s.get_products().keys() | join(' ') }}" \
        | cut -d' ' -f2-)
    [[ -z $salt_envs ]] && die "Cannot detect products envs"
    for salt_env in $salt_envs; do
        echo "Configuring product $salt_env..."
        $SALT_CALL --local state.sls metalk8s.products.configured \
            saltenv="$salt_env" \
            pillar="{'metalk8s': {'endpoints': \
            $(salt-call --out txt pillar.get metalk8s:endpoints | cut -c 8-)}}" \
            test="$DRY_RUN" \
            --retcode-passthrough
    done
    # Make the new version available
    echo "Making new versions available"
    $SALT_CALL state.sls metalk8s.products saltenv="$SALTENV" test="$DRY_RUN" \
        --retcode-passthrough
}

# Main

_set_env
[ -z "$SALTENV" ] && die "saltenv not set"

run "Add products" _add_products ${PRODUCTS[@]+"${PRODUCTS[@]}"}
run "Configure products" _configure_products

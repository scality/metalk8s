#!/bin/bash

BOOTSTRAP_CONFIG="/etc/metalk8s/bootstrap.yaml"
DEBUG="on"
LOGFILE="/tmp/iso.log"
DRY_RUN="False"

# Helpers
_usage() {
    echo "iso-manager.sh [options]"
    echo "Options:"
    echo "-p/--product <product path>:     Path to product folder or ISO"
    echo "-l/--log-file <logfile_path>:    path to log file"
    echo "-v/--verbose:                    Run in verbose mode"
    echo "-d/--dry-run:                    Run actions in dry run mode"
}

# Exit with error code and message
die() {
    echo "$*" 1>&2 ;
    exit 1;
}

# Run commands and log their output
_log() {
    if [ -n "$LOGFILE" ]; then
        "$@" >> "$LOGFILE" 2>&1
    else
        "$@" >&2
    fi
}

# Run commands and display/write the output to stdout/logfile
_info() {
    if [ "$DEBUG" == "info" ]; then
        _log "$@"
    else
        "$@" >&/dev/null
    fi
}

# helper function to set the current saltenv
_set_env() {
    if [ -z "$SALTENV" ]; then
        SALTENV="metalk8s-$(salt-call --out txt slsutil.renderer \
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
    products=("$(salt-call pillar.get metalk8s:products \
        --out txt | cut -d' ' -f2- | tr -d '[],')")
    for product in "$@"; do
        if ! containsElement "$product" "$@"; then
            products+=("$product")
        fi
    done
    _log echo "Collecting products..."
    _info echo "${products[@]}"
    # build product list
    product_list=${products[0]}
    for i in "${products[@]:1}"; do
        product_list+=,$i
    done
    _log echo "Updating bootstrap.yaml"
    _info salt-call state.single file.serialize "$BOOTSTRAP_CONFIG" \
        dataset="{'products': {'metalk8s': [$product_list]}}" \
        merge_if_exists=True \
        formatter=yaml \
        show_changes=True \
        test=$DRY_RUN
    return $?
}

_configure_products() {
    # Mount products
    _log echo "Mount products..."
    _info salt-call state.sls metalk8s.products.mounted \
        saltenv="$SALTENV" test=$DRY_RUN
    # Configure repos
    salt_envs=$(salt-call --out txt slsutil.renderer \
        string="{{ salt.metalk8s.get_products().keys() | join(' ') }}" \
        | cut -d' ' -f2-)
    [[ -z $salt_envs ]] && die "Cannot detect products envs"
    for salt_env in $salt_envs; do
        _log echo "Configuring product $salt_env..."
        _info salt-call --local state.sls metalk8s.products.configured \
            saltenv="$salt_env" \
            pillar="{'metalk8s': {'endpoints': \
            $(salt-call --out txt pillar.get metalk8s:endpoints | cut -c 8-)}}" \
            test=$DRY_RUN
    done
    # Make the new version available
    _log echo "Making new versions available"
    _info salt-call state.sls metalk8s.products saltenv="$SALTENV" test="$DRY_RUN"
}

# Main

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
      DEBUG="info"
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

_set_env
[ -z "$SALTENV" ] && die "saltenv not set"

_add_products "${PRODUCTS[@]}"
_configure_products

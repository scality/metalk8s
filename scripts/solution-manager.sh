#!/bin/bash
set -e
set -u
set -o pipefail

SOLUTION_CONFIG="/etc/metalk8s/solutions.yaml"
VERBOSE=${VERBOSE:-0}
LOGFILE="/var/log/metalk8s-solution-manager.log"
SALT_CALL=${SALT_CALL:-salt-call}
CRICTL=${CRICTL:-crictl}
SALT=""
SALTENV=""
PILLAR=""


_usage() {
    echo "solution-manager.sh [options]"
    echo "Options:"
    echo "-a/--add <solution path>:        Add solution from ISO path"
    echo "-d/--del <solution path>:        Uninstall solution from ISO path"
    echo "-l/--log-file <logfile_path>:    Path to log file"
    echo "-v/--verbose:                    Run in verbose mode"
}

SOLUTIONS_ADD=()
SOLUTIONS_REMOVE=()
EXISTENT_SOLUTIONS=()
while (( "$#" )); do
  case "$1" in
    -a|--add)
      SOLUTIONS_ADD+=("$2")
      shift 2
      ;;
    -d|--del)
      SOLUTIONS_REMOVE+=("$2")
      shift 2
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
--- MetalK8s solution manager started on $(date -u -R) ---
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

_check_salt_master() {
  [ -z "$SALTENV" ] && die "Cannot detect current salt env"
  # check if salt master is up
  master_ps=$($CRICTL ps -q --label io.kubernetes.container.name=salt-master)
  [ -z "$master_ps" ] && die "Cannot find salt master container"
  SALT="$CRICTL exec $master_ps "
  return 0
}

_set_bootstrap_id() {
  local -r bootstrap_id=$(
        ${SALT_CALL} --local --out txt grains.get id \
        | awk '/^local\: /{ print $2 }'
    )

    PILLAR=(
      "{"
      "  'bootstrap_id': '$bootstrap_id'"
      "}"
    )

}
_init () {
    _set_env
    _check_salt_master
    _set_bootstrap_id
    if [ ! -f "$SOLUTION_CONFIG" ]; then
      echo "archives: []" >"$SOLUTION_CONFIG"
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

add_solutions() {
    add=("$@")
    for solution in "${add[@]}"; do
        if ! containsElement "'$solution'" \
             "${EXISTENT_SOLUTIONS[@]+"${EXISTENT_SOLUTIONS[@]}"}"; then
            EXISTENT_SOLUTIONS+=("'$solution'")
        fi
    done
}

remove_solutions() {
  delete=("$@")
  for target in "${delete[@]}"; do
    for i in "${!EXISTENT_SOLUTIONS[@]}"; do
      if [[ "${EXISTENT_SOLUTIONS[i]}" = "$target" ]]; then
        unset 'EXISTENT_SOLUTIONS[i]'
      fi
    done
  done
  # Rebuild the gaps in the array
  for i in "${!EXISTENT_SOLUTIONS[@]}"; do
    new_array+=( "${EXISTENT_SOLUTIONS[i]}" )
  done
  EXISTENT_SOLUTIONS=("${new_array[@]+"${new_array[@]}"}")
  unset new_array
}

_add_del_solution() {
    # Skip adding/deleting solutions if none is passed
    [ ${#SOLUTIONS_REMOVE[@]} -lt 1  ] && [ ${#SOLUTIONS_ADD[@]} -lt 1 ] && return 0
    # The use salt file.serialize merge require having full list
    # salt-call output example:
    # local: ["/tmp/solution1.iso", "/tmp/solution2.iso"]
    # parsed products:
    # ("/tmp/solution1.iso" "/tmp/solution2.iso")
    IFS=" " read -r -a \
        EXISTENT_SOLUTIONS <<< "$(salt-call --out txt slsutil.renderer \
          string="{{ pillar.metalk8s.solutions.configured | join(' ') }}" | cut -d' ' -f2- | tr -d '{}' )"
    # Add new solutions
    if [ ${#SOLUTIONS_ADD[@]} -ge 1 ]; then
        add_solutions "${SOLUTIONS_ADD[@]}"
    fi
    # Remove unwanted solutions
    if [ ${#SOLUTIONS_REMOVE[@]} -ge 1 ]; then
        remove_solutions "${SOLUTIONS_REMOVE[@]}"
    fi
    echo "Collecting solutions..."
    # build product list
    if [ ${#EXISTENT_SOLUTIONS[@]} -eq 0 ]; then
        solutions_list=""
    else
        solutions_list=${EXISTENT_SOLUTIONS[0]}
        for i in "${EXISTENT_SOLUTIONS[@]:1}"; do
            solutions_list+=,$i
        done
    fi

    echo "Updating $SOLUTION_CONFIG"
    $SALT_CALL state.single file.serialize "$SOLUTION_CONFIG" \
        dataset="{'archives': [$solutions_list]}" \
        merge_if_exists=True \
        formatter=yaml \
        show_changes=True \
        --retcode-passthrough
    return $?
}

_configure_solutions() {
    echo "Mount solutions..."
    $SALT salt-run state.orchestrate \
        metalk8s.orchestrate.solutions.available \
        saltenv="$SALTENV" \
        pillar="${PILLAR[*]}"
    echo "Configure and deploy solutions..."
    $SALT salt-run state.orchestrate \
        metalk8s.orchestrate.solutions \
        saltenv="$SALTENV" \
        pillar="${PILLAR[*]}"
}

# Main
_init
run "Add/Delete solution" _add_del_solution
run "Configure solutions" _configure_solutions

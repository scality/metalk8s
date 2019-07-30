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
SOLUTION_PATH=""
SOLUTION_NAME=""
SOLUTION_VERSION=""


_usage() {
    echo "solution-manager.sh [options]"
    echo "Options:"
    echo "-s/--solution <solution path>:   Path to solution ISO"
    echo "-n/--name <solution name>:       Solution name"
    echo "--version <solution version>:    Version fo the solution"
    echo "-l/--log-file <logfile_path>:    Path to log file"
    echo "-v/--verbose:                    Run in verbose mode"
}

SOLUTIONS=()
while (( "$#" )); do
  case "$1" in
    -s|--solution)
      SOLUTIONS+=("$2")
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

_add_solution() {
    # Skip adding solutions if none is passed
    [ ${#SOLUTIONS[@]} -lt 1 ] && return 0
    # The use salt file.serialize merge require having full list
    # salt-call output example:
    # local: ["/tmp/solution1.iso", "/tmp/solution2.iso"]
    # parsed products:
    # ("/tmp/solution1.iso" "/tmp/solution2.iso")
    local existent_solutions=()
    IFS=" " read -r -a \
        existent_solutions <<< "$(salt-call pillar.get metalk8s:solutions:configured \
        --out txt | cut -d' ' -f2- | tr -d '[],{}')"
    for solution in "${SOLUTIONS[@]}"; do
        if ! containsElement "'$solution'" \
             "${existent_solutions[@]+"${existent_solutions[@]}"}"; then
            existent_solutions+=("'$solution'")
        fi
    done
    echo "Collecting solutions..."
    echo "${existent_solutions[@]}"
    # build product list
    solutions_list=${existent_solutions[0]}
    for i in "${existent_solutions[@]:1}"; do
        solutions_list+=,$i
    done

    echo "Updating metalk8s.solutions.yaml"
    $SALT_CALL state.single file.serialize "$SOLUTION_CONFIG" \
        dataset="{'archives': [$solutions_list]}" \
        merge_if_exists=True \
        formatter=yaml \
        show_changes=True \
        --retcode-passthrough
    return $?
}

_configure_solutions() {
    echo "Configuring solutions..."
    $SALT salt-run state.orchestrate \
        metalk8s.orchestrate.solutions \
        saltenv="$SALTENV" \
        pillar="${PILLAR[*]}"
}

# Main
_init
run "Add solution" _add_solution
run "Configure solutions" _configure_solutions

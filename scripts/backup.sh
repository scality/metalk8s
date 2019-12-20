#!/bin/bash
set -e
set -u
set -o pipefail

VERBOSE=${VERBOSE:-0}
LOGFILE="/var/log/metalk8s/backup.log"
TAR_OPTS=(
    "--acls"
    "--selinux"
    "--xattrs"
    "--atime-preserve"
    "--preserve-permissions"
)
BACKUP_ARCHIVE="/var/lib/metalk8s/backup_$(date -u +%Y%m%d_%H%M%S).tar.gz"

_usage() {
    echo "$(basename "$0") [options]"
    echo "Options:"
    echo "-b/--backup-file <backup_file>:  Path to backup file"
    echo "-l/--log-file <logfile_path>:    Path to log file"
    echo "-v/--verbose:                    Run in verbose mode"
}

while (( "$#" )); do
  case "$1" in
    -v|--verbose)
      VERBOSE=1
      shift
      ;;
    -l|--log-file)
      LOGFILE="$2"
      shift 2
      ;;
    -b|--backup-file)
      BACKUP_ARCHIVE="$2"
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
BACKUP_DIR=$(mktemp -d)

mkdir -p "$(dirname "$LOGFILE")"

cat << EOF >> "${LOGFILE}"
--- Backup started on $(date -u -R) ---
EOF

exec > >(tee -ia "${LOGFILE}") 2>&1

cleanup() {
    rm -rf "${TMPFILES}" || true
    rm -rf "${BACKUP_DIR}" || true
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

_save_cp() {
    local -r src="$(readlink -f "$1")"
    local -r dst="$2"
    if [ -f "$src" ]; then
        echo "Copying '$src' to '$dst'"
        if [ ! -d "$(dirname "$dst")" ]; then
          echo "Creating '$(dirname "$dst")' directory"
          mkdir -p "$(dirname "$dst")"
        fi
        cp -a "$src" "$dst"
    elif [ -d "$src" ]; then
        for filename in "$src"/*; do
            _save_cp "$filename" "$dst/$(basename "$filename")"
        done
    else
        echo "Error: '$src' does not exists" >&2
        exit 1
    fi
}

backup_metalk8s_conf() {
    _save_cp "/etc/metalk8s" "${BACKUP_DIR}/metalk8s"
}

backup_cas() {
    local -r ca_dir='/etc/kubernetes/pki/'
    local -a ca_files=(
        'ca.key'
        'ca.crt'
        'front-proxy-ca.key'
        'front-proxy-ca.crt'
        'etcd/ca.key'
        'etcd/ca.crt'
        'sa.key'
        'sa.pub'
    )
    for ca in "${ca_files[@]}"; do
        _save_cp "${ca_dir}$ca" "${BACKUP_DIR}/kubernetes/pki/$ca"
    done
}

backup_etcd() {
    local -r etcd_snapshot="etcd_snapshot_$(date -u +%Y%m%d_%H%M%S)"
    local -r cmd=(
      "ETCDCTL_API=3 etcdctl --endpoints https://127.0.0.1:2379"
      "--cert /etc/kubernetes/pki/etcd/salt-master-etcd-client.crt"
      "--key /etc/kubernetes/pki/etcd/salt-master-etcd-client.key"
      "--cacert /etc/kubernetes/pki/etcd/ca.crt"
      "snapshot save $etcd_snapshot"
    )
    local etcd_container=''
    echo "Snapshot etcd"
    etcd_container="$(crictl ps -q \
        --label io.kubernetes.pod.namespace=kube-system \
        --label io.kubernetes.container.name=etcd \
        --state Running)"
    echo "Running '${cmd[*]}' in etcd container $etcd_container"
    crictl exec -i "$etcd_container" sh -c "${cmd[*]}"
    _save_cp \
        "/run/containerd/io.containerd.runtime.v1.linux/k8s.io/${etcd_container}/rootfs/${etcd_snapshot}" \
        "${BACKUP_DIR}/etcd_snapshot"
}

create_archive() {
    if [ ! -d "$(dirname "$BACKUP_ARCHIVE")" ]; then
        echo "Creating '$(dirname "$BACKUP_ARCHIVE")' directory"
        mkdir -p "$(dirname "$BACKUP_ARCHIVE")"
    fi
    tar "${TAR_OPTS[@]}" -C "$BACKUP_DIR" -cz -f "$BACKUP_ARCHIVE" ./
}

run "Backing up MetalK8s configurations" backup_metalk8s_conf
run "Backing up CAs certificates and keys" backup_cas
run "Backing up etcd data" backup_etcd
run "Creating backup archive '$BACKUP_ARCHIVE'" create_archive

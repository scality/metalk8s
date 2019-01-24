#!/bin/bash

set -e
set -u
if test -z "$(type -p)"; then set -o pipefail; fi

RPM=${RPM:-$(command -v rpm)}
SYSTEMCTL=${SYSTEMCTL:-$(command -v systemctl)}
YUM=${YUM:-$(command -v yum)}
SALT_CALL=${SALT_CALL:-salt-call}

SALT_MINION_FILE_CLIENT_LOCAL_CONF=/etc/salt/minion.d/99-file-client-local.conf

die() {
        >/dev/stderr echo "$@"
        exit 1
}

pre_minion_checks() {
        test "x$(whoami)" = "xroot" || die "Script must run as root"
        test -n "${RPM}" || die "rpm not found"
        test -x "${RPM}" || die "rpm at '${RPM}' is not executable"
        test -n "${SYSTEMCTL}" || die "systemctl not found"
        test -x "${SYSTEMCTL}" || die "systemctl at '${SYSTEMCTL}' is not executable"
        test -n "${YUM}" || die "yum not found"
        test -x "${YUM}" || die "yum at '${YUM}' is not executable"
}

disable_salt_minion_service() {
        ${SYSTEMCTL} disable salt-minion.service 2>/dev/null || true
}

stop_salt_minion_service() {
        ${SYSTEMCTL} stop salt-minion.service 2>/dev/null || true
}

configure_salt_repository() {
        ${RPM} --import https://repo.saltstack.com/yum/redhat/7/x86_64/archive/2018.3.3/SALTSTACK-GPG-KEY.pub
        cat > /etc/yum.repos.d/saltstack.repo << EOF
[saltstack-repo]
name=SaltStack repo for RHEL/CentOS \$releasever
baseurl=https://repo.saltstack.com/yum/redhat/\$releasever/\$basearch/archive/2018.3.3
enabled=1
gpgcheck=1
gpgkey=https://repo.saltstack.com/yum/redhat/\$releasever/\$basearch/archive/2018.3.3/SALTSTACK-GPG-KEY.pub
EOF
        ${YUM} clean expire-cache
}

install_salt_minion() {
        ${YUM} install -y salt-minion
}

configure_salt_minion_local_mode() {
        cat > "${SALT_MINION_FILE_CLIENT_LOCAL_CONF}" << EOF
file_client: local
EOF
}

run_bootstrap_prechecks() {
        ${SALT_CALL} --local --retcode-passthrough state.apply bootstrap.prechecks
}

install_kubelet() {
        ${SALT_CALL} --local --retcode-passthrough state.apply kubernetes.kubelet
}

main() {
        pre_minion_checks
        disable_salt_minion_service
        stop_salt_minion_service
        configure_salt_repository
        install_salt_minion
        configure_salt_minion_local_mode
        run_bootstrap_prechecks
        install_kubelet
}

main

#!/bin/bash

set -e
set -u
set -o pipefail

buildsrpm() {
    set -x
    chown build:build /home/build
    su -l build rpmdev-setuptree
    for src in ${SOURCES:-}; do
        cp "/rpmbuild/SOURCES/${src}" "/home/build/rpmbuild/SOURCES/${src}"
        chown build:build "/home/build/rpmbuild/SOURCES/${src}"
    done
    cp "/rpmbuild/SPECS/${SPEC}" "/home/build/rpmbuild/SPECS/${SPEC}"
    chown build:build "/home/build/rpmbuild/SPECS/${SPEC}"
    su -l build -c "rpmbuild -bs /home/build/rpmbuild/SPECS/${SPEC}"
    su -l build -c \
       "rpmlint -f /rpmbuild/rpmlintrc /home/build/rpmbuild/SRPMS/${SRPM}"
    cp "/home/build/rpmbuild/SRPMS/${SRPM}" "/rpmbuild/SRPMS/${SRPM}"
    chown "${TARGET_UID}:${TARGET_GID}" "/rpmbuild/SRPMS/${SRPM}"
}

buildrpm() {
    set -x
    yum-builddep -y "/rpmbuild/SRPMS/${SRPM}"
    chown build:build /home/build
    su -l build rpmdev-setuptree
    su -l build -c "rpmbuild --rebuild /rpmbuild/SRPMS/${SRPM}"
    for file in ${RPMS}; do
        su -l build -c \
           "rpmlint -f /rpmbuild/rpmlintrc /home/build/rpmbuild/RPMS/${file}"
    done
    for file in ${RPMS}; do
        cp "/home/build/rpmbuild/RPMS/${file}" \
           "/rpmbuild/RPMS/$(basename "${file}")"
        chown "${TARGET_UID}:${TARGET_GID}" \
              "/rpmbuild/RPMS/$(basename "${file}")"
    done
}

buildrepo() {
    set -x
    mkdir /tmp/repodata
    chown build:build /tmp/repodata
    createrepo --outputdir /tmp/repodata /repository
    cp -a /tmp/repodata/repodata/. /repository/repodata/
    chown -R "${TARGET_UID}:${TARGET_GID}" /repository/repodata/
}

download_packages() {
    set -x
    local -r releasever=${RELEASEVER:-7}
    local -r repo_cache_root=/install_root/var/cache/yum/x86_64/$releasever
    local -a packages=($@)
    local -a yum_opts=(
        --assumeyes
        --downloadonly
        --releasever="$releasever"
        --installroot=/install_root
    )

    yum groups install "${yum_opts[@]}" base core
    yum install "${yum_opts[@]}" "${packages[@]}"

    chown -R "$TARGET_UID:$TARGET_GID" "/install_root/var"

    while IFS=$'\n' read -r repo; do
        cp -a "$repo/packages" "repositories/${repo##*/}-el$releasever"
    done < <(find "$repo_cache_root" -maxdepth 1 -type d \
        -not -path "$repo_cache_root")
}

case ${1:-''} in
    buildrpm)
        buildrpm
        ;;
    buildsrpm)
        buildsrpm
        ;;
    buildrepo)
        buildrepo
        ;;
    download_packages)
        shift
        download_packages "$@"
        ;;
    '')
        exec /bin/bash
        ;;
    *)
        exec "$@"
        ;;
esac

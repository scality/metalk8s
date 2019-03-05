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

get_rpm_gpg_keys() {
    declare -gA RPM_GPG_KEYS
    local -r releasever=${RELEASEVER:-7}
    local -r basearch=${BASEARCH:-x86_64}

    while read -r repo gpg_keys; do
        RPM_GPG_KEYS[$repo]=$(eval echo "$gpg_keys")
    done < <(awk -F= '
        /^\[.+\]$/ {
            repo = gensub(/^\[(.+)\]$/, "\\1", $0)
        }

        $1 == "gpgkey" {
            gpg_keys = $2
            while (getline && /^\s*(https?)|(file)|(ftp):/) {
                gpg_keys = gpg_keys " " $0
            }
            print repo " " gpg_keys
            if (/^\[.+\]$/) {
                repo = gensub(/^\[(.+)\]$/, "\\1", $0)
            }
        }
    ' /etc/yum.repos.d/*)
}

download_packages() {
    set -x
    local -r releasever=${RELEASEVER:-7}
    local -r basearch=${BASEARCH:-x86_64}
    local -r repo_cache_root=/install_root/var/cache/yum/$basearch/$releasever
    local -r external_repo=$repo_cache_root/external/packages
    local -a packages=("$@")
    local -a yum_opts=(
        "--assumeyes"
        "--downloadonly"
        "--releasever=$releasever"
        "--installroot=/install_root"
    )

    get_rpm_gpg_keys

    yum groups install "${yum_opts[@]}" base core
    yum install "${yum_opts[@]}" "${packages[@]}"

    local package_name

    # Fetch packages from an URL and store them in the "external" repository.
    mkdir -p "$external_repo"
    for package in "${packages[@]}"; do
        if [[ $package =~ ^(https?)|(ftp):// ]]; then
            package_name=${package##*/}
            curl "$package" --output "$external_repo/$package_name" --retry 3
        fi
    done

    chown -R "$TARGET_UID:$TARGET_GID" "/install_root/var"

    local repo_name repo_dest gpg_key

    while IFS=$'\n' read -r repo; do
        repo_name=${repo##*/}
        repo_dest=/repositories/$repo_name-el$releasever
        cp -Ta "$repo/packages" "$repo_dest"
        if [[ ${RPM_GPG_KEYS[$repo_name]+_} ]]; then
            read -ra gpg_keys <<< "${RPM_GPG_KEYS[$repo_name]}"
            for key_id in "${!gpg_keys[@]}"; do
                gpg_key=$repo_dest/RPM-GPG-KEY-$repo_name-${releasever}_$((
                    key_id + 1 ))
                curl -s "${gpg_keys[$key_id]}" > "$gpg_key"
                chown "$TARGET_UID:$TARGET_GID" "$gpg_key"
            done
        fi
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

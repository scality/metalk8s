#!/bin/bash

set -e
set -u
set -o pipefail

declare -r ENABLED_REPOS=(
    epel
    kubernetes
    saltstack
)

buildmeta() {
    set -x
    chown build:build /home/build
    su -l build -c rpmdev-setuptree
    cp "/rpmbuild/SPECS/${SPEC}" "/home/build/rpmbuild/SPECS/${SPEC}"
    su -l build -c \
       "rpmspec -P \"/home/build/rpmbuild/SPECS/${SPEC}\" \
> \"/home/build/rpmbuild/${META}\""
    cp "/home/build/rpmbuild/${META}" "/rpmbuild/META/${META}"
    su -l build -c \
        "rpmspec -q --requires \"/home/build/rpmbuild/SPECS/${SPEC}\" \
        > \"/home/build/rpmbuild/requires.txt\""
    cp "/home/build/rpmbuild/requires.txt" "/rpmbuild/META/"
}

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
    # Overwrite version if supported
    sed -i 's/_VERSION_/'"${VERSION}"'/g' "/home/build/rpmbuild/SPECS/${SPEC}"
    su -l build -c "rpmbuild -bs /home/build/rpmbuild/SPECS/${SPEC}"
    su -l build -c \
       "rpmlint -f /rpmbuild/rpmlintrc /home/build/rpmbuild/SRPMS/${SRPM}"
    cp "/home/build/rpmbuild/SRPMS/${SRPM}" "/rpmbuild/SRPMS/${SRPM}"
    chown "${TARGET_UID}:${TARGET_GID}" "/rpmbuild/SRPMS/${SRPM}"
}

buildrpm() {
    set -x
    yum-builddep -y "/rpmbuild/SRPMS/${SRPM}" >&2
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
    # shellcheck disable=SC2034
    # The variable is used in the `eval` below
    local -r basearch=${BASEARCH:-x86_64}

    while read -r repo gpg_keys; do
        RPM_GPG_KEYS[$repo]=$(eval echo "$gpg_keys")
    done < <(awk -F= '
        match($0, /^\[(.+)\]$/, capture) {
            repo = capture[1]
        }

        $1 == "gpgkey" {
            gpg_keys = $2
            while (getline && /^\s*(https?)|(file)|(ftp):/) {
                gpg_keys = gpg_keys " " $0
            }
            print repo " " gpg_keys
            if (match($0, /^\[(.+)\]$/, capture)) {
                repo = capture[1]
            }
        }
    ' /etc/yum.repos.d/*)
}

in_dependencies() {
    local -r search=$1
    shift

    for element; do
        [[ $element =~ ^"$search"(-[0-9]+(\.[0-9]+)+)?$ ]] && break
    done
}

join_array() {
    IFS=$1
    shift
    echo "$*"
}

resolve_dependencies() {
    local -ra packages=("$@")
    local -a dependencies=("$@")

    for package in "${packages[@]}"; do
        while read -r dependency repo relpath; do
            if [[ $repo =~ $ENABLED_REPOS_RE ]] && \
               # We exclude all package from "base" directory of Saltstack since those
               # packages are available in "base" CentOS/RHEL 7 repositories
               { [[ $repo != "saltstack" ]] || [[ $relpath != base/* ]]; } && \
               ! in_dependencies "$dependency" "${dependencies[@]}"; then
                dependencies+=("$dependency")
            fi
        done < <(
            repoquery --requires --resolve --recursive \
                      --queryformat='%{name} %{repoid} %{relativepath}' "$package"
        )
    done

    echo "${dependencies[@]}"
}

download_repository_gpg_keys() {
    local -r repo_name=$1

    if [[ ${RPM_GPG_KEYS[$repo_name]+_} ]]; then
        read -ra gpg_keys <<< "${RPM_GPG_KEYS[$repo_name]}"
        for key_id in "${!gpg_keys[@]}"; do
            gpg_key=RPM-GPG-KEY-metalk8s-$repo_name-${releasever}_$((
                key_id + 1 ))
            curl -s "${gpg_keys[$key_id]}" > "$gpg_key"
            chown "$TARGET_UID:$TARGET_GID" "$gpg_key"
        done
    fi
}

download_packages() {
    set -x
    declare -g ENABLED_REPOS_RE
    local enabled_repos_yum
    local -r releasever=${RELEASEVER:-7}
    local -a packages=("$@")
    local -a packages_to_download

    ENABLED_REPOS_RE="^($(join_array '|' "${ENABLED_REPOS[@]}"))$"
    enabled_repos_yum=$(join_array ',' "${ENABLED_REPOS[@]}")

    get_rpm_gpg_keys

    read -ra packages_to_download < <(resolve_dependencies "${packages[@]}")

    local current_repo repo_dir gpg_key query_format

    query_format='%{repoid} %{name}-%{epoch}:%{version}-%{release}.%{arch}'

    while read -r repo_name package; do
        if [[ $repo_name != "${current_repo:-}" ]]; then
            current_repo=$repo_name
            repo_dir=/repositories/metalk8s-$repo_name-el$releasever
            mkdir -p "$repo_dir"
            pushd "$repo_dir" > /dev/null
            download_repository_gpg_keys "$repo_name"
        fi
        yumdownloader --disablerepo="*" \
                      --enablerepo="$repo_name" "$package"
    done < <(
        repoquery --queryformat="$query_format" \
                  --disablerepo="*" \
                  --enablerepo="$enabled_repos_yum" \
                  "${packages_to_download[@]}" | grep -vE '\.src$' | sort
    )

    chown -R "$TARGET_UID:$TARGET_GID" "/repositories"
}

case ${1:-} in
    buildmeta)
        buildmeta
        ;;
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

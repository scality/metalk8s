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
        [[ $element =~ ^"$search"-[0-9]+(\.[0-9]+)+$ ]] && return 0
    done
    return 1
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

add_dependencies(){
    while read -r name dependency repo relpath; do
        case $repo in
            epel)
                if [ ${#EPEL_DEPS[@]} -eq 0 ] || ! in_dependencies "$name" "${EPEL_DEPS[@]}"; then
                    EPEL_DEPS+=("$dependency")
                fi
                ;;
            kubernetes)
                if [ ${#KUBERNETES_DEPS[@]} -eq 0 ] || ! in_dependencies "$name" "${KUBERNETES_DEPS[@]}"; then
                    KUBERNETES_DEPS+=("$dependency")
                fi
                ;;
            saltstack)
                # We exclude all package from "base" directory of Saltstack since those
                # packages are available in "base" CentOS/RHEL 7 repositories
                if [[ $relpath != base/* ]] && \
                   ([ ${#SALT_DEPS[@]} -eq 0 ] || ! in_dependencies "$name" "${SALT_DEPS[@]}"); then
                    SALT_DEPS+=("$dependency")
                fi
                ;;
            *)
                # Not a package we want to take care of
                ;;
        esac
    done
}

download_packages() {
    set -x
    declare -ga EPEL_DEPS=() KUBERNETES_DEPS=() SALT_DEPS=()
    local -r releasever=${RELEASEVER:-7}
    local -a packages=("$@")
    local query_format query_opts repo_dir
    local -a dependencies=()

    query_format='%{name} %{name}-%{version} %{repoid} %{relativepath}'
    query_opts=""
    if [[ "$releasever" == "8" ]]; then
        # On new repoquery version, if we do not specify the `latest-limit`
        # it will return all packages that match the query
        # We only want to download the latest one
        query_opts="--latest-limit=1"
    fi

    for package in "${packages[@]}"; do
        # Check from which repo the package come from
        # NOTE: We keep the original "package" name here so that we do not enforce
        # version if not needed
        # (a package may require another version of this one)
        add_dependencies < <(
            repoquery  $query_opts --queryformat="%{name} $package %{repoid} %{relativepath}" "$package"
        )
    done
    add_dependencies < <(
        repoquery --requires --resolve --recursive $query_opts \
            --queryformat="$query_format" "${packages[@]}"
    )

    get_rpm_gpg_keys

    for repo in "${ENABLED_REPOS[@]}"; do
        repo_dir=/repositories/metalk8s-$repo-el$releasever
        mkdir -p "$repo_dir"
        pushd "$repo_dir" > /dev/null
        download_repository_gpg_keys "$repo"

        case $repo in
            epel)
                dependencies=("${EPEL_DEPS[@]}")
                ;;
            kubernetes)
                dependencies=("${KUBERNETES_DEPS[@]}")
                ;;
            saltstack)
                dependencies=("${SALT_DEPS[@]}")
                ;;
            *)
                echo "Error got an unknown repo $repo" >&2
                exit 1
                ;;
        esac

        yumdownloader --disablerepo="*" \
                      --enablerepo="$repo" "${dependencies[@]}"
    done

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

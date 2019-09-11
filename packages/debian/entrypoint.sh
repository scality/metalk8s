#!/bin/bash


set -e
set -u
set -o pipefail


# Build a DEB from the source files, using debuild.
builddeb() {
    set -x

    mkdir -p /debbuild/build-pkg/src
    cp -r /debbuild/pkg-meta/* /debbuild/build-pkg
    cp -r /debbuild/pkg-src/* /debbuild/build-pkg/src

    # Overwrite version if supported
    sed -i 's/_VERSION_/'"${VERSION}"'/g' "/debbuild/build-pkg/debian/changelog"

    pushd /debbuild/build-pkg 1>/dev/null
    debuild -b -uc -us

    cp /debbuild/*.deb /debbuild/result
    chown -R "${TARGET_UID}:${TARGET_GID}" /debbuild/result
}


# Build a DEB from an RPM file, using alien.
rpm2deb() {
    set -x

    pushd /debbuild/result 1> /dev/null
    alien --bump=0 /rpmbuild/source.rpm

    chown "${TARGET_UID}:${TARGET_GID}" *
}


download_packages() {
    set -x
    local -a list_pkg=("$@")

    # Salt-minion GPG Key
    curl -s https://repo.saltstack.com/apt/ubuntu/18.04/amd64/2018.3/SALTSTACK-GPG-KEY.pub | apt-key add -
    echo 'deb http://repo.saltstack.com/apt/ubuntu/18.04/amd64/2018.3 bionic main' >> /etc/apt/sources.list.d/saltstack.list

    # Kubectl & Kubelet GPG key
    echo "deb http://apt.kubernetes.io/ kubernetes-xenial main" >>/etc/apt/sources.list.d/kubernetes.list
    curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
    apt update

    for pkg in $(list_pkg)
    do
        echo "$pkg" >> packages_list.txt
        for dep in $(apt-rdepends "$pkg" | grep -E 'Depends' | cut -d " " -f4)
            do echo "$dep" >> packages_list.txt
        done
    done

    mkdir /packages/pkg_downloaded
    pushd /packages/pkg_downloaded
    while IFS=$'\n' read -r pkg2dl
    do
    	apt-get download "$pkg2dl"
    done
    chown "${TARGET_UID}:${TARGET_GID}" *
}

case ${1:- } in
    builddeb)
        builddeb
        ;;
    rpm2deb)
        rpm2deb
        ;;
    download_packages)
        download_packages
        ;;
    '')
        exec /bin/bash
        ;;
    *)
        exec "$@"
        ;;
esac

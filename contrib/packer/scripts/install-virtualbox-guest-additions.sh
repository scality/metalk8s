#!/bin/bash

set -x
set -u
set -e

PACKAGES="bzip2 gcc kernel-devel kernel-devel-$(uname -r) kernel-headers perl"

VBOX_VERSION=$(pwd)/.vbox_version

if [ "$PACKER_BUILDER_TYPE" != "virtualbox-iso" ]; then
    exit 0
fi

VBOX_ISO="$(pwd)/VBoxGuestAdditions_$(cat "${VBOX_VERSION}").iso"
VBOX_ISO_MOUNT=/mnt/VBoxGuestAdditions

test -e "${VBOX_ISO}" || exit 1

mkdir "${VBOX_ISO_MOUNT}"
mount -t iso9660 -o loop,ro "${VBOX_ISO}" "${VBOX_ISO_MOUNT}"

yum install -y ${PACKAGES}
"${VBOX_ISO_MOUNT}/VBoxLinuxAdditions.run"
yum remove -y ${PACKAGES}

umount "${VBOX_ISO_MOUNT}"
rmdir "${VBOX_ISO_MOUNT}"

rm "${VBOX_ISO}"

#!/bin/bash

declare -r RHSM_USERNAME=$1
           RHSM_PASSWORD=$2
           RETRIES=${3:-5}
           WAIT=${4:-2}

# shellcheck disable=SC1091
. /etc/os-release

declare -r OS_MAJOR_RELEASE=${VERSION_ID%%.*}

case "$OS_MAJOR_RELEASE" in
    7)
        declare -ra REPOS_TO_ENABLE=(
            rhel-7-server-optional-rpms
            rhel-7-server-extras-rpms
        )
        ;;
    8)
        declare -ra REPOS_TO_ENABLE=(
            rhel-8-for-x86_64-baseos-rpms
            rhel-8-for-x86_64-appstream-rpms
        )
        ;;
esac

# We retry $RETRIES times in case of transient network issues.
for (( try=0; try <= RETRIES; ++try )); do
    if subscription-manager register --username "$RHSM_USERNAME" \
            --password "$RHSM_PASSWORD" --auto-attach; then
        echo "Successfully registered to RHSM"

        # shellcheck disable=SC2046
        if subscription-manager repos \
                $(printf -- "--enable=%s " "${REPOS_TO_ENABLE[@]}"); then
            echo "Yum repositories successfully enabled"
            break
        fi
    fi
    echo "Subscription failed, retrying in $WAIT seconds" 1>&2
    subscription-manager unregister
    sleep "$WAIT"
done

if ! subscription-manager status; then
    echo "Unable to register this host to RHSM after $RETRIES retries." \
         "Here is the content of /var/log/rhsm.log:" 1>&2
    cat /var/log/rhsm/rhsm.log 1>&2
    exit 1
fi

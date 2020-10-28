#!/bin/bash

declare -r RHSM_USERNAME=$1
           RHSM_PASSWORD=$2
           RETRIES=${3:-5}
           WAIT=${4:-2}

# We retry $RETRIES times in case of transient network issues.
for (( try=0; try <= RETRIES; ++try )); do
    if subscription-manager register --username "$RHSM_USERNAME" \
            --password "$RHSM_PASSWORD" --auto-attach; then
        echo "Successfully registered to RHSM"
        if subscription-manager repos --enable=rhel-7-server-extras-rpms \
                --enable=rhel-7-server-optional-rpms; then
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

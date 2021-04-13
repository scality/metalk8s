#!/bin/bash
# This script force regeneration of all certificates (including kubeconfig)
# on a MetalK8s platform. This is only for tests purposes and should not
# be run on a production platform.

set -o pipefail

ARCHIVE_MOUNTPOINT=$1
DAYS_VALID=370
# DAYS_REMAINING must be lower than DAYS_VALID to avoid
# renewing certificates on every Salt highstate run
DAYS_REMAINING=365
# BEACON_NOTIFY_DAYS must be greater or equal than DAYS_REMAINING
# in order to trigger a certificate renewal. It should also be lower
# than DAYS_VALID to avoid firing an event on every beacon run.
BEACON_NOTIFY_DAYS=365
BEACON_INTERVAL=60
ARCHIVE_PRODUCT_INFO=$ARCHIVE_MOUNTPOINT/product.txt
SALT_DEFAULTS=$ARCHIVE_MOUNTPOINT/salt/metalk8s/defaults.yaml
OVERRIDE_ROOT_CONF=/etc/salt/master.d/90-metalk8s-root-override.conf
OVERRIDE_PILLAR_DEST=/etc/salt/pillar-override
WAIT_RENEWAL=${WAIT_RENEWAL:-120}

# shellcheck disable=SC1090
. "$ARCHIVE_PRODUCT_INFO"
# shellcheck disable=SC1090
. "$ARCHIVE_MOUNTPOINT/common.sh"

override_pillar_conf() {
    local -r certs_pillar_match="\ \ '*':\n    - match: compound\n    - certificates\n"

    mkdir -p "${OVERRIDE_ROOT_CONF%/*}" "${OVERRIDE_PILLAR_DEST%/*}"

    cp -rp "$ARCHIVE_MOUNTPOINT/pillar" "$OVERRIDE_PILLAR_DEST"

    cat > "$OVERRIDE_ROOT_CONF" << EOF
pillar_roots:
  metalk8s-$VERSION:
    - "$OVERRIDE_PILLAR_DEST"
EOF

    cat > "$OVERRIDE_PILLAR_DEST/certificates.sls" << EOF
certificates:
  client:
    days_remaining: $DAYS_REMAINING
    days_valid: $DAYS_VALID
  kubeconfig:
    days_remaining: $DAYS_REMAINING
    days_valid: $DAYS_VALID
  server:
    days_remaining: $DAYS_REMAINING
    days_valid: $DAYS_VALID
EOF

    sed -i "/^metalk8s-{{ version }}:$/a $certs_pillar_match" \
        "$OVERRIDE_PILLAR_DEST/top.sls"

    crictl stop "$(get_salt_container)"

    echo "Wait for Salt master to be ready..."
    kubectl wait pods --for=condition=Ready \
        --selector app.kubernetes.io/name=salt-master \
        --namespace kube-system \
        --kubeconfig /etc/kubernetes/admin.conf
}

run_certificates_beacon_state() {
    local salt_container
    local -ri retries=5 sleep_time=10
    local -r pillar=${1:-}

    readarray -t minions < <(get_salt_minion_ids)
    salt_container=$(get_salt_container)

    # We apply state on each minion instead of using '*' target,
    # otherwise it is much more flaky, this way we can also retry few
    # times for each minion.
    for minion in "${minions[@]}"; do
        echo "Applying new beacon configuration on $minion..."
        retry "$retries" "$sleep_time" \
            crictl exec -i "$salt_container" \
            salt "$minion" state.apply metalk8s.beacon.certificates \
            ${pillar:+pillar="$pillar"} \
        || exit 1
    done

}

apply_new_beacon_conf() {
    local -ra pillar=(
        "{"
        "    'certificates': {"
        "        'beacon': {"
        "            'notify_days': $BEACON_NOTIFY_DAYS,"
        "            'interval': $BEACON_INTERVAL",
        "            'run_once': True,"
        "        }"
        "    }"
        "}"
    )

    run_certificates_beacon_state "${pillar[*]}"
}

reset_beacon_conf() {
    local salt_container

    salt_container=$(get_salt_container)

    readarray -t minions < <(get_salt_minion_ids)

    for minion in "${minions[@]}"; do
        crictl exec -i "$salt_container" \
            salt-run metalk8s_saltutil.wait_minions tgt="$minion"
        crictl exec -i "$salt_container" salt "$minion" beacons.disable
    done

    run_certificates_beacon_state

    crictl exec -i "$salt_container" salt "*" beacons.enable
}

check_certificates_renewal() {
    local -i return_code=0
    local -ri retries=5 time_sleep=10
    local -a minions certificates
    local salt_container certificates_pillar

    salt_container=$(get_salt_container)

    readarray -t minions < <(get_salt_minion_ids)

    for minion in "${minions[@]}"; do
        echo "Checking certificates for $minion..."

        certificates_pillar=$(
            crictl exec -i "$salt_container" \
                salt "$minion" pillar.get certificates \
                --out json --out-indent -1
        )

        readarray -t certificates < <(python - <<EOF
import yaml

with open('$SALT_DEFAULTS', 'r') as fd:
    defaults = yaml.safe_load(fd)['certificates']

pillar = yaml.safe_load('$certificates_pillar').values()[0]

watched_certs = []
for cert_type in ('client', 'kubeconfig', 'server'):
    for cert, infos in pillar.get(cert_type, {}).get('files', {}).items():
        if infos.get('watched', defaults[cert_type]['files'][cert]['watched']):
            watched_certs.append(
                infos.get('path', defaults[cert_type]['files'][cert]['path'])
            )

print("\n".join(watched_certs))
EOF
)

        for certificate in "${certificates[@]}"; do
            # Sometimes it may fail if the minion is loaded
            ctime=$(
                retry "$retries" "$time_sleep" \
                crictl exec -i "$salt_container" \
                salt "$minion" file.stats "$certificate" --out yaml | \
                awk '$1 == "ctime:" { printf "%.0f", $2 }'
            ) || exit 1

            if (( ctime > TIMESTAMP )); then
                echo "- OK: $certificate successfully regenerated at $ctime."
            else
                echo "- FAILED: $certificate not regenerated."
                return_code=1
            fi
        done
    done

    return $return_code
}

reset_pillar_conf() {
    rm -rf "$OVERRIDE_ROOT_CONF" "$OVERRIDE_PILLAR_DEST"

    crictl stop "$(get_salt_container)"

    # Wait for master to come back before exiting script
    get_salt_container
}

TIMESTAMP=$(date +%s)

echo "Tests start at $TIMESTAMP."

# Update Salt configuration to trigger certificates renewal
echo "Overriding pillar configuration..."
override_pillar_conf
echo "Applying new beacon configuration..."
apply_new_beacon_conf

SLEEP_TIME=$(( BEACON_INTERVAL + WAIT_RENEWAL ))
echo "Waiting ${SLEEP_TIME}s for certificates to be regenerated..."
sleep $SLEEP_TIME

echo "Checking certificates renewal..."
for ((EXIT_CODE=1, max_try=3, try=1; try <= max_try; ++try)); do
    if check_certificates_renewal; then
        EXIT_CODE=0
        break
    elif [ "$try" -lt "$max_try" ]; then
        echo "All certificates are not renewed yet, retrying in" \
             "$SLEEP_TIME seconds..."
        sleep $SLEEP_TIME
    fi
done

echo "Resetting pillar configuration..."
reset_pillar_conf
echo "Resetting beacon configuration..."
reset_beacon_conf

exit $EXIT_CODE

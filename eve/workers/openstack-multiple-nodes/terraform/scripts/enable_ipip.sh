#!/usr/bin/env bash

PATCH_FILE='/tmp/patch.yaml'

cat > "$PATCH_FILE" << END
- op: replace
  path: "/spec/ipipMode"
  value: Always
END

MAX_RETRIES=10
ATTEMPTS=0
RET=1

while [ "$RET" -ne 0 ] && [ $ATTEMPTS -lt $MAX_RETRIES ]; do
    (( ATTEMPTS++ ))
    echo "Attempt $ATTEMPTS out of $MAX_RETRIES"
    sudo kubectl patch ippool default-ipv4-ippool \
        --kubeconfig=/etc/kubernetes/admin.conf  \
        --type json --patch "$(cat $PATCH_FILE)"
    RET=$?
    sleep 5
done

rm "$PATCH_FILE"

exit $RET

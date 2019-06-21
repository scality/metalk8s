#!/usr/bin/env bash

PATCH_FILE='/tmp/patch.yaml'

cat > "$PATCH_FILE" << END
- op: replace
  path: "/spec/ipipMode"
  value: Always
END

sudo kubectl patch ippool default-ipv4-ippool \
     --kubeconfig=/etc/kubernetes/admin.conf  \
     --type json --patch "$(cat $PATCH_FILE)"

rm "$PATCH_FILE"

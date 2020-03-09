#!/bin/bash

declare -r id="$1" data="$2"

cat > /run/metalk8s/signals/${id}.json <<EOF
{
  "status": "SUCCESS",
  "id": "$id",
  "reason": "status update",
  "data": "$data"
}
EOF
cat >> /run/metalk8s/signals/history <<EOF
Sending signal to '$id' [`date`]:
$(cat /run/metalk8s/signals/${id}.json)

EOF

if [[ -f /run/metalk8s/scripts/activate-proxy ]]; then
  source /run/metalk8s/scripts/activate-proxy
fi

<%wc_notify%> --data-binary "@/run/metalk8s/signals/${id}.json"

deactivate-proxy &> /dev/null || exit 0

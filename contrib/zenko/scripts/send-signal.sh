#!/bin/bash

notify_main() {
  <%notify_main%> $@
}
notify_client_id() {
  <%notify_client_id%> $@
}


if [ "$#" -eq 3 ]; then
  declare -r handle="$1" id="$2" data="$3"
elif [ "$#" -eq 2 ]; then
  declare -r handle="main" id="$1" data="$2"
else
  >&2 echo "Cannot send signal: invalid number of arguments"
  exit 1
fi

cat > /run/metalk8s/signals/${handle}-${id}.json <<EOF
{
  "status": "SUCCESS",
  "id": "$id",
  "reason": "status update",
  "data": "$data"
}
EOF
cat >> /run/metalk8s/signals/history <<EOF
Sending signal to '$handle' for ID '$id' [`date`]:
$(cat /run/metalk8s/signals/${handle}-${id}.json)

EOF

source /run/metalk8s/scripts/activate-proxy &> /dev/null

"notify_$handle" --data-binary "@/run/metalk8s/signals/${handle}-${id}.json"

deactivate-proxy &> /dev/null || exit 0

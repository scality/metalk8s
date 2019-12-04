#!/bin/bash

set -xue -o pipefail

OUTPUT_FILE="/etc/metalk8s/bootstrap.yaml"

mkdir -p "$(dirname $OUTPUT_FILE)"

mkdir -p /etc/salt
hostname > /etc/salt/minion_id

KEEPALIVED_ENABLED=false
API_SERVER_VIP=${1:-}

[[ $API_SERVER_VIP ]] && KEEPALIVED_ENABLED=true

WORKLOAD_PLANE_IP=$(
  ip -4 address show eth0 | sed -rn 's/^\s*inet ([0-9.\/]+).*$/\1/p'
)
eval "$(ipcalc --network --prefix "$WORKLOAD_PLANE_IP")"
WORKLOAD_PLANE_NETWORK=$NETWORK/$PREFIX

CONTROL_PLANE_IP=$(
  ip -4 address show eth1 | sed -rn 's/^\s*inet ([0-9.\/]+).*$/\1/p'
)
eval "$(ipcalc --network --prefix "$CONTROL_PLANE_IP")"
CONTROL_PLANE_NETWORK=$NETWORK/$PREFIX

cat > "$OUTPUT_FILE" << EOF
apiVersion: metalk8s.scality.com/v1alpha2
kind: BootstrapConfiguration
networks:
  controlPlane: $CONTROL_PLANE_NETWORK
  workloadPlane: $WORKLOAD_PLANE_NETWORK
ca:
  minion: $(cat /etc/salt/minion_id)
apiServer:
  host: ${API_SERVER_VIP:-${CONTROL_PLANE_IP%/*}}
  keepalived:
    enabled: $KEEPALIVED_ENABLED
archives:
  - /var/tmp/metalk8s
EOF

ls "$(dirname $OUTPUT_FILE)"
cat "$OUTPUT_FILE"

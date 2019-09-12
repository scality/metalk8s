#!/bin/bash

set -xue -o pipefail

OUTPUT_FILE="/etc/metalk8s/bootstrap.yaml"

mkdir -p "$(dirname $OUTPUT_FILE)"

mkdir -p /etc/salt
hostname > /etc/salt/minion_id

cat > "$OUTPUT_FILE" << EOF
apiVersion: metalk8s.scality.com/v1alpha2
kind: BootstrapConfiguration
networks:
  controlPlane: 10.100.0.0/16
  workloadPlane: 10.100.0.0/16
ca:
  minion: $(cat /etc/salt/minion_id)
apiServer:
  host: $(ip route get 10.100.0.0 | awk '/10.100.0.0/{ print $6 }')
archives:
  - /var/tmp/metalk8s
EOF

ls "$(dirname $OUTPUT_FILE)"
cat "$OUTPUT_FILE"

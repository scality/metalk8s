#!/bin/bash

set -xue -o pipefail

OUTPUT_FILE="/etc/metalk8s/bootstrap.yaml"

mkdir -p "$(dirname $OUTPUT_FILE)"

cat > "$OUTPUT_FILE" << EOF
apiVersion: metalk8s.scality.com/v1alpha2
kind: BootstrapConfiguration
networks:
  controlPlane: 192.168.42.0/24
  workloadPlane: 192.168.42.0/24
ca:
  minion: $(hostname)
EOF

ls "$(dirname $OUTPUT_FILE)"
cat "$OUTPUT_FILE"

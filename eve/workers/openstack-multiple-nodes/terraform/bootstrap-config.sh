#!/bin/bash

set -xue -o pipefail

OUTPUT_FILE="/etc/metalk8s/bootstrap.yaml"

mkdir -p "$(dirname $OUTPUT_FILE)"

cat > "$OUTPUT_FILE" << EOF
apiVersion: metalk8s.scality.com/v1alpha2
kind: BootstrapConfiguration
networks:
  controlPlane: 172.21.254.0/28
  workloadPlane: 172.21.254.32/27
ca:
  minion: $(hostname)
EOF

ls "$(dirname $OUTPUT_FILE)"
cat "$OUTPUT_FILE"

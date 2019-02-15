#!/bin/bash

set -xue -o pipefail

mkdir -p /etc/cni/net.d/

cat > /etc/cni/net.d/98-containerd-test-bridge.conf << EOF
{
    "cniVersion": "0.3.1",
    "name": "bridge",
    "type": "bridge",
    "bridge": "cnio0",
    "isGateway": true,
    "ipMasq": true,
    "ipam": {
        "type": "host-local",
        "ranges": [
          [{"subnet": "192.168.123.0/24"}]
        ],
        "routes": [{"dst": "0.0.0.0/0"}]
    }
}
EOF

cat > /etc/cni/net.d/99-containerd-test-loopback.conf << EOF
{
    "cniVersion": "0.3.1",
    "type": "loopback"
}
EOF

systemctl restart containerd

cat > /tmp/sandbox.json << EOF
{
    "metadata": {
        "name": "nginx-sandbox",
        "namespace": "default",
        "attempt": 1,
        "uid": "hdishd83djaidwnduwk28bcsb"
    },
    "linux": {
    }
}
EOF
cat > /tmp/container.json << EOF
{
  "metadata": {
      "name": "busybox"
  },
  "image":{
      "image": "busybox"
  },
  "command": [
      "top"
  ],
  "linux": {
  }
}
EOF

crictl version

PODID=$(crictl runp /tmp/sandbox.json)
crictl pods
crictl inspectp "${PODID}"

crictl pull busybox

CONTAINERID=$(crictl create "${PODID}" /tmp/container.json /tmp/sandbox.json)

crictl ps -a
crictl start "${CONTAINERID}"
crictl ps
crictl inspect "${CONTAINERID}"
crictl exec -i -t "${CONTAINERID}" ls
crictl exec -i -t "${CONTAINERID}" ps ax

crictl stats

crictl stop "${CONTAINERID}"
crictl rm "${CONTAINERID}"

crictl stopp "${PODID}"
crictl rmp "${PODID}"

rm -f /etc/cni/net.d/98-containerd-test-bridge.conf
rm -f /etc/cni/net.d/99-containerd-test-loopback.conf
rm -f /tmp/sandbox.json
rm -f /tmp/container.json

systemctl restart containerd

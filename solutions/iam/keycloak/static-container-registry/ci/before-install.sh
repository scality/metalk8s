#!/bin/bash

SKOPEO_VERSION=0.1.38-1~ubuntu16.04~ppa1
CONTAINERD_VERSION=1.2.6
CRICTL_VERSION=1.14.0

set -xue -o pipefail

SKOPEO_DEB=skopeo_${SKOPEO_VERSION}_amd64.deb
CONTAINERD_ARCHIVE=containerd-${CONTAINERD_VERSION}.linux-amd64.tar.gz
CRICTL_ARCHIVE=crictl-v${CRICTL_VERSION}-linux-amd64.tar.gz

curl -LO https://launchpad.net/~projectatomic/+archive/ubuntu/ppa/+files/${SKOPEO_DEB}
dpkg -x ${SKOPEO_DEB} skopeo/
sudo cp skopeo/usr/bin/skopeo /usr/local/bin/skopeo
rm -r skopeo ${SKOPEO_DEB}

curl -LO https://github.com/containerd/containerd/releases/download/v${CONTAINERD_VERSION}/${CONTAINERD_ARCHIVE}
tar xvf ${CONTAINERD_ARCHIVE}
sudo mv bin/* /usr/bin/
rm ${CONTAINERD_ARCHIVE}

cat << EOF | sudo tee /etc/systemd/system/containerd.service
[Unit]
Description=containerd container runtime
Documentation=https://containerd.io
After=network.target

[Service]
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/bin/containerd

Delegate=yes
KillMode=process
# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNPROC=infinity
LimitCORE=infinity
LimitNOFILE=1048576
# Comment TasksMax if your systemd version does not supports it.
# Only systemd 226 and above support this version.
TasksMax=infinity

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload

sudo mkdir -p /etc/containerd
cat << EOF | sudo tee /etc/containerd/config.toml
[plugins]
  [plugins.cri]
    [plugins.cri.registry]
      [plugins.cri.registry.mirrors]
        [plugins.cri.registry.mirrors."127.0.0.1:5000"]
          endpoint = ["http://127.0.0.1:5000"]
EOF

sudo systemctl start containerd

sudo systemctl start crio

curl -LO https://github.com/kubernetes-sigs/cri-tools/releases/download/v${CRICTL_VERSION}/${CRICTL_ARCHIVE}
tar xvf ${CRICTL_ARCHIVE} crictl
sudo mv crictl /usr/local/bin/crictl

#!/bin/bash

set -xue -o pipefail

curl -LO https://launchpad.net/~projectatomic/+archive/ubuntu/ppa/+files/skopeo_0.1.36-1~dev~ubuntu16.04.2~ppa16_amd64.deb
dpkg -x skopeo_0.1.36-1~dev~ubuntu16.04.2~ppa16_amd64.deb skopeo/
sudo cp skopeo/usr/bin/skopeo /usr/local/bin/skopeo
rm -r skopeo skopeo_0.1.36-1~dev~ubuntu16.04.2~ppa16_amd64.deb

curl -LO https://github.com/containerd/containerd/releases/download/v1.2.6/containerd-1.2.6.linux-amd64.tar.gz
tar xvf containerd-1.2.6.linux-amd64.tar.gz
sudo mv bin/* /usr/bin/
rm containerd-1.2.6.linux-amd64.tar.gz

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

curl -LO https://github.com/kubernetes-sigs/cri-tools/releases/download/v1.14.0/crictl-v1.14.0-linux-amd64.tar.gz
tar xvf crictl-v1.14.0-linux-amd64.tar.gz crictl
sudo mv crictl /usr/local/bin/crictl

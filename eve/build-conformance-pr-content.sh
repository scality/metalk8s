#!/bin/bash

DIRECTORY=${DIRECTORY:-pr-content}
SONOBUOY_RES_DIR=${SONOBUOY_RES_DIR:-sonobuoy-results}

K8S_VERSION=${K8S_VERSION:-}
METALK8S_VERSION=${METALK8S_VERSION:-}

dest="${DIRECTORY}/v${K8S_VERSION}/MetalK8s"
doc_url="https://metal-k8s.readthedocs.io/en/development-${METALK8S_VERSION}/"

mkdir -p "$dest"

cat > "$dest/PRODUCT.yaml" << EOF
vendor: Scality
name: MetalK8s
description: "An opinionated Kubernetes distribution with a focus on long-term on-prem deployments"
version: ${METALK8S_VERSION}
type: distribution
website_url: https://github.com/scality/metalk8s/
repo_url: https://github.com/scality/metalk8s.git
product_logo_url: https://raw.githubusercontent.com/scality/metalk8s/development/${METALK8S_VERSION}/artwork/metalk8s-logo-vertical.svg
documentation_url: ${doc_url}
EOF

sed "s%@@DOC_URL@@%${doc_url}%g" > "$dest/README.md" << 'ENDREADME'
# MetalK8s
Official documentation: @@DOC_URL@@

## Prerequisites
- An OpenStack cluster
- The official CentOS 7.9 2009 image pre-loaded in Glance
- Three VMs with 8 vCPUs, 16 GB of RAM, 40GB of local storage

## Provisioning
- Create two private network in the OpenStack cluster with port security
  disabled, and a subnet in each:

  * Control-plane network: 192.168.1.0/24
  * Workload-plane network: 192.168.2.0/24

- Create VM instances using the CentOS 7.9 image, and attach each of them to a
  public network (for internet access) and the two private networks.

- Configure the interface for private networks (make sure to fill in the
  appropriate MAC address):

  ```
  $ cat > /etc/sysconfig/network-scripts/ifcfg-eth1 << EOF
  BOOTPROTO=dhcp
  DEVICE=eth1
  HWADDR=...
  ONBOOT=yes
  TYPE=Ethernet
  USERCTL=no
  PEERDNS=no
  EOF
  $ cat > /etc/sysconfig/network-scripts/ifcfg-eth2 << EOF
  BOOTPROTO=dhcp
  DEVICE=eth2
  HWADDR=...
  ONBOOT=yes
  TYPE=Ethernet
  USERCTL=no
  PEERDNS=no
  EOF
  $ systemctl restart network
  ```

### Provisioning the Bootstrap Node
On one of the VMs, which will act as the *bootstrap* node, perform the following
steps:

- Set up the Salt Minion ID:

  ```
  $ mkdir /etc/salt; chmod 0700 /etc/salt
  $ echo metalk8s-bootstrap > /etc/salt/minion_id
  ```

- Download MetalK8s ISO to `/home/centos/metalk8s.iso`

- Create `/etc/metalk8s/bootstrap.yaml`:

  ```
  $ mkdir /etc/metalk8s
  $ cat > /etc/metalk8s/bootstrap.yaml << EOF
  apiVersion:  metalk8s.scality.com/v1alpha3
  kind: BootstrapConfiguration
  networks:
    controlPlane:
        cidr: 192.168.1.0/24
    workloadPlane:
        cidr: 192.168.2.0/24
    portmap:
        cidr: 0.0.0.0/0
    nodeport:
        cidr: 0.0.0.0/0
  ca:
    minion: metalk8s-bootstrap
  archives:
    - /home/centos/metalk8s.iso
  EOF
  ```

- Bootstrap the cluster

  ```
  $ mkdir /mnt/metalk8s
  $ mount /home/centos/metalk8s.iso /mnt/metalk8s
  $ cd /mnt/metalk8s
  $ ./bootstrap.sh
  ```

### Provisioning the Cluster Nodes
Add the 2 other nodes to the cluster according to the procedure outlined in the
MetalK8s documentation. The easiest way to achieve this is through the MetalK8s
UI.

## Preparing the Cluster to Run Sonobuoy
On the *bootstrap* node:

- Configure access to the Kubernetes API server

  ```
  $ export KUBECONFIG=/etc/kubernetes/admin.conf
  ```

- Remove taints from the node, which would prevent the Sonobuoy *Pod*s from
  being scheduled:

  ```
  $ kubectl taint node metalk8s-bootstrap node-role.kubernetes.io/bootstrap-
  node/metalk8s-bootstrap untainted
  $ kubectl taint node metalk8s-bootstrap node-role.kubernetes.io/infra-
  node/metalk8s-bootstrap untainted
  ```

## Running Sonobuoy and Collecting Results
Follow the
[instructions](https://github.com/cncf/k8s-conformance/blob/master/instructions.md)
as found in the [CNCF K8s Conformance repository](https://github.com/cncf/k8s-conformance).
ENDREADME

cp "${SONOBUOY_RES_DIR}/plugins/e2e/results/global/e2e.log" "$dest/"
cp "${SONOBUOY_RES_DIR}/plugins/e2e/results/global/junit_01.xml" "$dest/"

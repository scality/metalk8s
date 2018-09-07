############################################
Re-Installing MetalK8s on a Standing Cluster
############################################

On test clusters, it is easiest to delete all cluster machines and volumes
before reinstalling MetalK8s. However, in production deployments, this may not be
possible. When a fresh installation is not possible, you must remove or reset
the following.

Files and Directories
+++++++++++++++++++++

Remove the following files and directories.

* /usr/local/bin/

* /etc/yum.repos.d/prometheus-rpm.repo

* /etc/yum.repos.d/docker.repo

* /etc/yum_docker.conf

* /etc/cni/net.d/

* /etc/modules-load.d/kube_proxy-ipvs.conf

* /etc/modules-load.d/kubespray-br_netfilter.conf

* /etc/modprobe.d/ansible-hardening-disable-dccp.conf

* /etc/modprobe.d/ansible-hardening-disable-usb-storage.conf

* /etc/docker

* /var/lib/kubelet

* /var/lib/fluent-bit

* /var/lib/prometheus

* /var/lib/dockershim/

* /var/lib/cni

* /opt/cni/bin

* /mnt/vg_metalk8s/*

* /home/kube

Packages
++++++++

Remove the following packages with:

::
  $ yum remove <package>

* docker-ce

* docker-ce-selinux

* node_exporter

sysctl Options
++++++++++++++

Open /etc/sysctl.conf and set the following entries to 0:

* net.bridge.bridge-nf-call-iptables

* net.bridge.bridge-nf-call-arptables

* net.bridge.bridge-nf-call-ip6tables

Save the conf file; then stop sysctl with:

::
  $ sysctl stop sysctl

Revert to Original Values
+++++++++++++++++++++++++

* /etc/ssh/sshd_config

* /etc/group (Open /etc/group and remove the kube, etcd, and prometheus groups.)

* /etc/passwd (Open /etc/passwd and remove user kube-cert, docker, etcd, and
  prometheus.)

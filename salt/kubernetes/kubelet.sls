Install EPEL repository:
  pkg.installed:
    - name: epel-release

Install containerd dependencies:
  pkg.installed:
    - pkgs:
      - runc

Update container-selinux:
  pkg.installed:
    - sources:
      - container-selinux: https://buildlogs.centos.org/centos/7/virt/x86_64/container/container-selinux-2.77-1.el7.noarch.rpm

Install containerd:
  pkg.installed:
    - fromrepo: epel
    - pkgs:
      - containerd

Configure Kubernetes repository:
  pkgrepo.managed:
    - humanname: Kubernetes
    - name: kubernetes
    - baseurl: https://packages.cloud.google.com/yum/repos/kubernetes-el7-x86_64
    - gpgcheck: 1
    - repo_gpgcheck: 1
    - gpgkey: https://packages.cloud.google.com/yum/doc/yum-key.gpg https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg
    - enabled: 0

Install kubelet dependencies:
  pkg.installed:
    - pkgs:
      - ebtables
      - socat

Install kubelet:
  pkg.installed:
    - fromrepo: kubernetes
    - pkgs:
      - kubelet

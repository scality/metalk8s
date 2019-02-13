{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo
  - metalk8s.runc

Install container-selinux:
  pkg.installed:
    - sources:
      - container-selinux: ftp://ftp.pbone.net/mirror/ftp.scientificlinux.org/linux/scientific/7x/external_products/extras/x86_64/container-selinux-2.77-1.el7_6.noarch.rpm

Install containerd:
  pkg.installed:
    - name: containerd
    - version: {{ repo.containerd.version }}
    - fromrepo: {{ repo.containerd.name }}
    - require:
      - pkgrepo: Configure Kubernetes repository
      - pkg: Install runc
      - pkg: Install container-selinux


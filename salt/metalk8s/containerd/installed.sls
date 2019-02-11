{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo
  - metalk8s.runc

Install container-selinux:
  pkg.installed:
    - name: container-selinux

Install containerd:
  pkg.installed:
    - name: containerd
    - version: {{ repo.containerd.version }}
    - fromrepo: {{ repo.containerd.name }}
    - require:
      - pkgrepo: Configure Kubernetes repository
      - pkg: Install runc
      - pkg: Install container-selinux


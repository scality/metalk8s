{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo
  - metalk8s.runc

Install container-selinux:
  pkg.installed:
    - name: container-selinux
    - version: {{ repo.packages['container-selinux'].version }}
    - fromrepo: {{ repo.repositories.keys() | list | join(',') }}
    - require_in:
      - pkg: Install runc
    - require:
      - pkgrepo: Configure {{ repo.packages['container-selinux'].repository }} repository

Install containerd:
  pkg.installed:
    - name: containerd
    - version: {{ repo.packages.containerd.version }}
    - fromrepo: {{ repo.repositories.keys() | list | join(',') }}
    - require:
      - pkgrepo: Configure {{ repo.packages.containerd.repository }} repository
      - pkg: Install runc
      - pkg: Install container-selinux

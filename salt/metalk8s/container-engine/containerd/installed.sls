{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}

{%- set registry_ip = metalk8s.endpoints['repositories'].ip %}
{%- set registry_port = metalk8s.endpoints['repositories'].ports.http %}

include:
  - metalk8s.repo

Install container-selinux:
  {{ pkg_installed('container-selinux') }}
    - require:
      - test: Repositories configured

Install runc:
  {{ pkg_installed('runc') }}
    - require:
      - test: Repositories configured
      - pkg: Install container-selinux

Install containerd:
  {{ pkg_installed('containerd') }}
    - require:
      - test: Repositories configured
      - pkg: Install runc
      - pkg: Install container-selinux

Configure registry IP in containerd conf:
  file.managed:
    - name: /etc/containerd/config.toml
    - makedirs: true
    - contents: |
        [plugins.cri.registry.mirrors."{{ registry_ip }}:{{ registry_port }}"]
          endpoint = ["http://{{ registry_ip }}:{{ registry_port }}"]
    - require:
      - pkg: Install containerd

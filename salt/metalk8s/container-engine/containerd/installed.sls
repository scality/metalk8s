{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}

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
      - metalk8s_package_manager: Install container-selinux

Install containerd:
  {{ pkg_installed('containerd') }}
    - require:
      - test: Repositories configured
      - metalk8s_package_manager: Install runc
      - metalk8s_package_manager: Install container-selinux
 
Install and configure cri-tools:
  {{ pkg_installed('cri-tools') }}
    - require:
      - test: Repositories configured
  file.serialize:
    - name: /etc/crictl.yaml
    - dataset:
        runtime-endpoint: {{ kubelet.service.options.get("container-runtime-endpoint") }}
        image-endpoint: {{ kubelet.service.options.get("container-runtime-endpoint") }}
    - merge_if_exists: true
    - user: root
    - group: root
    - mode: '0644'
    - formatter: yaml

Configure registry IP in containerd conf:
  file.managed:
    - name: /etc/containerd/config.toml
    - makedirs: true
    - contents: |
        [plugins.cri.registry.mirrors."{{ registry_ip }}:{{ registry_port }}"]
          endpoint = ["http://{{ registry_ip }}:{{ registry_port }}"]
    - require:
      - metalk8s_package_manager: Install containerd

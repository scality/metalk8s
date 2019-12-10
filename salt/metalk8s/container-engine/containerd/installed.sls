{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}
{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/map.jinja" import networks with context %}
{%- from "metalk8s/map.jinja" import proxies with context %}

{%- set registry_ip = metalk8s.endpoints['repositories'].ip %}
{%- set registry_port = metalk8s.endpoints['repositories'].ports.http %}

include:
  - metalk8s.repo

{%- if grains['os_family'].lower() == 'redhat' %}
Install container-selinux:
  {{ pkg_installed('container-selinux') }}
    - require:
      - test: Repositories configured
{%- endif %}

Install runc:
  {{ pkg_installed('runc') }}
    - require:
      - test: Repositories configured
      {%- if grains['os_family'].lower() == 'redhat' %}
      - metalk8s_package_manager: Install container-selinux
      {%- endif %}

Install containerd:
  {{ pkg_installed('containerd') }}
    - require:
      - test: Repositories configured
      - metalk8s_package_manager: Install runc
      - file: Create containerd service drop-in
      - file: Configure registry IP in containerd conf
      {%- if grains['os_family'].lower() == 'redhat' %}
      - metalk8s_package_manager: Install container-selinux
      {%- endif %}

Create containerd service drop-in:
  file.managed:
    - name: /etc/systemd/system/containerd.service.d/50-metalk8s.conf
    - source: salt://{{ slspath }}/files/50-metalk8s.conf.j2
    - template: jinja
    - user: root
    - group: root
    - mode: 0644
    - makedirs: true
    - dir_mode: 0755
    - context:
      environment: >-
      {%- if proxies %}
        {%- set no_proxy = ["localhost", "127.0.0.1"] + networks.values %}
        {%- if proxies.no_proxy | default %}
          {%- do no_proxy.extend(proxies.no_proxy) %}
        {%- endif %}
        NO_PROXY={{ no_proxy | unique | join(",") }}
        {%- if proxies.http | default %}
        HTTP_PROXY={{ proxies.http }}
        {%- endif %}
        {%- if proxies.https | default %}
        HTTPS_PROXY={{ proxies.https }}
        {%- endif %}
      {%- endif %}

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
        [plugins.cri.registry.mirrors."{{ repo.registry_endpoint }}"]
          endpoint = ["http://{{ registry_ip }}:{{ registry_port }}"]

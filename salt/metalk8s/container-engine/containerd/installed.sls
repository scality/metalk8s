{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}
{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/map.jinja" import networks with context %}
{%- from "metalk8s/map.jinja" import proxies with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- set registry_eps = [] %}
{%- set pillar_endpoints = metalk8s.endpoints.repositories %}
{%- if not pillar_endpoints | is_list %}
  {%- set pillar_endpoints = [pillar_endpoints] %}
{%- endif %}
{%- for ep in pillar_endpoints %}
  {%- do registry_eps.append('http://' ~ ep.ip ~ ":" ~ ep.ports.http) %}
{%- endfor %}

{%- set no_proxy = [
  "localhost", "127.0.0.1",
  networks.control_plane.cidr, networks.workload_plane.cidr,
  networks.pod, networks.service
] %}
{%- if proxies.no_proxy | default %}
  {%- do no_proxy.extend(proxies.no_proxy) %}
{%- endif %}

include:
  - metalk8s.repo
  - .running

{%- if grains['os_family'].lower() == 'redhat' %}
Install container-selinux:
  {{ pkg_installed('container-selinux') }}
    - require:
      - test: Repositories configured
    - require_in:
      - metalk8s_package_manager: Install containerd
{%- endif %}

Install containerd:
  {{ pkg_installed('containerd.io') }}
    - require:
      - test: Repositories configured
      - file: Create containerd service drop-in
    - watch_in:
      - service: Ensure containerd running

Create containerd service drop-in:
  file.managed:
    - name: /etc/systemd/system/containerd.service.d/50-metalk8s.conf
    - source: salt://{{ slspath }}/files/50-metalk8s.conf.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - dir_mode: '0755'
    - context:
        containerd_args:
          - --log-level
          - {{ "debug" if metalk8s.debug else "info" }}
        environment:
          NO_PROXY: "{{ no_proxy | unique | join(",") }}"
          {%- if proxies.http | default %}
          HTTP_PROXY: "{{ proxies.http }}"
          {%- endif %}
          {%- if proxies.https | default %}
          HTTPS_PROXY: "{{ proxies.https }}"
          {%- endif %}
    - watch_in:
      - service: Ensure containerd running

Install and configure cri-tools:
  {{ pkg_installed('cri-tools') }}
    - require:
      - test: Repositories configured
    - require_in:
      - test: Ensure containerd is ready
  file.serialize:
    - name: /etc/crictl.yaml
    - dataset:
        runtime-endpoint: {{ kubelet.container_runtime_endpoint }}
        image-endpoint: {{ kubelet.container_runtime_endpoint }}
    - merge_if_exists: true
    - user: root
    - group: root
    - mode: '0644'
    - formatter: yaml
    - require_in:
      - test: Ensure containerd is ready

Configure containerd:
  file.managed:
    - name: /etc/containerd/config.toml
    - makedirs: true
    - contents: |
        version = 3

        [plugins.'io.containerd.cri.v1.images'.pinned_images]
          sandbox = "{{ build_image_name("pause") }}"

        [plugins."io.containerd.cri.v1.images".registry]
          config_path = "/etc/containerd/certs.d"

        [plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.runc.options]
          SystemdCgroup = true

        [debug]
          level = "{{ 'debug' if metalk8s.debug else 'info' }}"
    - watch_in:
      - service: Ensure containerd running


Configure containerd registries:
  file.managed:
    - name: /etc/containerd/certs.d/{{ repo.registry_endpoint }}/hosts.toml
    - makedirs: true
    - contents: |
        {%- for ep in registry_eps %}
        [host."{{ ep }}"]
          capabilities = ["pull", "resolve"]
        {%- endfor %}
    - require:
      - file: Configure containerd
    # NOTE: We do not use `watch_in` here since changes on those `certs.d` file do
    # not need a restart of the containerd service.
    - require_in:
      - service: Ensure containerd running

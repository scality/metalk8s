{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}

include:
{%- if grains.os_family == 'RedHat' %}
  - metalk8s.repo
{% endif %}
{%- if kubelet.container_engine %}
  - metalk8s.container-engine.{{ kubelet.container_engine }}
{%- endif %}

Install and configure cri-tools:
{%- if grains.os_family == 'RedHat' %}
  {{ pkg_installed('cri-tools') }}
    - require:
      - test: Repositories configured
{% else %}
  pkg.installed:
    - name: cri-tools
{% endif %}
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

Install kubelet:
{%- if grains.os_family == 'RedHat' %}
  {{ pkg_installed('kubelet') }}
    - require:
      - test: Repositories configured
{%- elif grains.os == 'Ubuntu' %}
  pkg.installed:
    - name: kubelet=1.11.10-00
{% endif %}

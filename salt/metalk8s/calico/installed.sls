{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo

Install calico-cni-plugin:
  {{ pkg_installed('calico-cni-plugin') }}
{%- if repo.online_mode %}
    - sources:
      - calico-cni-plugin: {{ repo.base_path }}/{{ repo.packages['calico-cni-plugin'].repository }}-el{{ grains.get('osmajorrelease') }}/x86_64/calico-cni-plugin-3.5.1-1.el7.x86_64.rpm
{%- endif %}
    - require:
      - test: Repositories configured

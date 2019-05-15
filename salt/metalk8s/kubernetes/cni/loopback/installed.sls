{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include:
  - metalk8s.repo

{%- if grains.os_family == 'RedHat' %}
Install kubernetes-cni:
  {{ pkg_installed('kubernetes-cni') }}
    - require:
      - test: Repositories configured
{%- elif grains.os == 'Ubuntu' %}
Install kubernetes-cni:
  pkg.installed:
    - name: kubernetes-cni
{%- endif %}

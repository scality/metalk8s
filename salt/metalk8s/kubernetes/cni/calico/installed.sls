{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo

Install calico-cni-plugin:
  {{ pkg_installed('calico-cni-plugin') }}
    - require:
      - test: Repositories configured

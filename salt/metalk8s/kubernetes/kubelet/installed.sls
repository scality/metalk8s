{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}

include:
  - metalk8s.repo
  - metalk8s.container-engine

Install kubelet:
  {{ pkg_installed('kubelet') }}
    - require:
      - test: Repositories configured

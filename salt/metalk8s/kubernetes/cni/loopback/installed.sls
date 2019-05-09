{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include:
  - metalk8s.repo

Install kubernetes-cni:
  {{ pkg_installed('kubernetes-cni') }}
    - require:
      - test: Repositories configured

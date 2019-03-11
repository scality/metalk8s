{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include:
  - metalk8s.repo

Install m2crypto:
  {{ pkg_installed('python34-m2crypto') }}
    - require:
      - test: Repositories configured

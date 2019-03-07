{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include:
  - metalk8s.repo

Install runc:
  {{ pkg_installed('runc') }}
    - require:
      - test: Repositories configured

{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include :
  - metalk8s.repo

Install kubectl:
  {{ pkg_installed('kubectl') }}
    - require:
      - test: Repositories configured

{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include :
  - metalk8s.repo

Install salt-minion:
  {{ pkg_installed('salt-minion') }}
    - require:
      - test: Repositories configured

{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include:
  - metalk8s.repo

Install sos report and custom plugins:
  {{ pkg_installed('metalk8s-sosreport') }}
    - require:
      - test: Repositories configured

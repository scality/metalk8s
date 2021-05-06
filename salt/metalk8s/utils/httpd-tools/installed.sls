{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include:
  - metalk8s.repo

Install httpd-tools:
  {{ pkg_installed('httpd-tools') }}
    - require:
      - test: Repositories configured

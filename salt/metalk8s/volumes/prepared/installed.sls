{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include:
  - metalk8s.repo

Install e2fsprogs:
  {{ pkg_installed('e2fsprogs') }}
    - require:
      - test: Repositories configured

Install xfsprogs:
  {{ pkg_installed('xfsprogs') }}
    - require:
      - test: Repositories configured

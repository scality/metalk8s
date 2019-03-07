{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include:
  - metalk8s.repo

Install Python Kubernetes client:
  {{ pkg_installed('python2-kubernetes') }}
    - reload_modules: true
    - require:
      - test: Repositories configured

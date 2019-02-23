{% set salt_minion_version = '2018.3.3'%}
include :
  - metalk8s.repo

Install salt-minion:
  pkg.installed:
    - name: salt-minion
    - version: {{ salt_minion_version }}
{%- from "metalk8s/map.jinja" import repo with context %}

include :
  - metalk8s.repo

Install salt-minion:
  pkg.installed:
    - name: salt-minion
    - version: {{ repo.packages['salt-minion'].version }}
    - fromrepo: {{ repo.repositories.keys() | list | join(',') }}
    - require:
      - pkgrepo: Configure {{ repo.packages['salt-minion'].repository }} repository

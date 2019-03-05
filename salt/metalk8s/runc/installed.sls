{% from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo

Install runc:
  pkg.installed:
    - name: runc
    - version: {{ repo.packages.runc.version }}
    - fromrepo: {{ repo.repositories.keys() | list | join(',') }}
    - require:
      - pkgrepo: Configure {{ repo.packages.runc.repository }} repository

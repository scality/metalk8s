{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo

Install m2crypto:
  pkg.installed:
    - name: m2crypto
    - version: {{ repo.packages.m2crypto.version }}
    - fromrepo: {{ repo.repositories.keys() | list | join(',') }}
    - require:
      - pkgrepo: Configure {{ repo.packages.m2crypto.repository }} repository

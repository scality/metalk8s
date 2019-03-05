{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo

Install Python Kubernetes client:
  pkg.installed:
    - name: python2-kubernetes
    - version: {{ repo.packages['python2-kubernetes'].version }}
    - fromrepo: {{ repo.repositories.keys() | list | join(',') }}
    - reload_modules: true
    - require:
      - pkgrepo: Configure {{ repo.packages['python2-kubernetes'].repository }} repository

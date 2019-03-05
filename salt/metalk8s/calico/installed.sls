{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo

Install calico-cni-plugin:
  pkg.installed:
    - name: calico-cni-plugin
    - version: {{ repo.packages['calico-cni-plugin'].version }}
    - fromrepo: {{ repo.repositories.keys() | list | join(',') }}
    - require:
      - pkgrepo: Configure {{ repo.packages['calico-cni-plugin'].repository }} repository

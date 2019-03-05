{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo

Install calico-cni-plugin:
  pkg.installed:
    - name: calico-cni-plugin
    - version: {{ repo.packages['calico-cni-plugin'].repository }}
    - require:
      - pkgrepo: Configure {{ repo.packages['calico-cni-plugin'].repository }}

{% from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo

# TODO: Add a fromrepo for offline
Install runc:
  pkg.installed:
    - name: runc
    - version: {{ repo.runc.version }}

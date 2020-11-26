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

Install gdisk:
  {{ pkg_installed('gdisk') }}
    - require:
      - test: Repositories configured

# Needed by the sparse volume cleanup script
Ensure Python 3 is available:
  test.fail_without_changes:
    - comment: Could not find a working Python 3 installation
    - unless: /usr/bin/env python3 --version

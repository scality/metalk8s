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

Install lvm2:
  {{ pkg_installed('lvm2') }}
    - require:
      - test: Repositories configured

# Needed by the sparse volume cleanup script
Ensure Python 3 is available:
  test.fail_without_changes:
    - comment: Could not find a working Python 3 installation
    - unless: /usr/bin/env python3 --version

Create the sparse file directory:
  file.directory:
    - name: /var/lib/metalk8s/storage/sparse/
    - makedirs: True

Set up systemd template unit for sparse loop device provisioning:
  file.managed:
    - name: /etc/systemd/system/metalk8s-sparse-volume@.service
    - source: salt://{{ slspath }}/files/metalk8s-sparse-volume@.service
    - user: root
    - group : root
    - mode: '0644'

Install clean-up script:
  file.managed:
    - name: /usr/local/libexec/metalk8s-sparse-volume-cleanup
    - source: salt://{{ slspath }}/files/sparse_volume_cleanup.py
    - user: root
    - group : root
    - mode: '0755'

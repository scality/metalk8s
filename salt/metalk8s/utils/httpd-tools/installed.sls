{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include:
  - metalk8s.repo

{%- if grains['os_family'].lower() == 'redhat' %}
Install httpd-tools:
  {{ pkg_installed('httpd-tools') }}
    - require:
      - test: Repositories configured
{% else %}

Os family is debian-based:
  test.succeed_without_changes: []

{%- endif %}

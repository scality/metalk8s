{%- from "metalk8s/macro.sls" import pkg_installed with context %}

{% if grains.os_family == 'RedHat' %}
include:
  - metalk8s.repo

Install m2crypto:
  {{ pkg_installed('m2crypto') }}
    - require:
      - test: Repositories configured
{% elif grains.os == 'Ubuntu' %}
Install m2crypto:
  pkg.installed:
    - name: python-m2crypto
{% endif %}

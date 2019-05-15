{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import kubeadm_preflight with context %}

include:
  - metalk8s.repo

Install recommended packages:
{% if grains.os_family == 'RedHat' %}
  {{ pkg_installed() }}
    - pkgs: {{ kubeadm_preflight.recommended.packages }}
    - require:
      - test: Repositories configured
{% else %}
  test.succeed_without_changes
{% endif %}

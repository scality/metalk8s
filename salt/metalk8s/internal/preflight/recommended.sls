{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import kubeadm_preflight with context %}

include:
  - metalk8s.repo

Install recommended packages:
  {{ pkg_installed() }}
    - pkgs: {{ kubeadm_preflight.recommended.packages }}
    - require:
      - test: Repositories configured

{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import kubeadm_preflight with context %}

include:
  - metalk8s.repo

{%- for pkg_name in kubeadm_preflight.mandatory.packages %}
Install recommended package "{{ pkg_name }}":
  {{ pkg_installed(pkg_name) }}
    - require:
      - test: Repositories configured
{%- endfor %}

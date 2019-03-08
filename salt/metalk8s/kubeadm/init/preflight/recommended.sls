{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import kubeadm_preflight with context %}

include:
  - metalk8s.repo

Install recommended packages:
  {{ pkg_installed() }}
    - pkgs: {{ kubeadm_preflight.recommended.packages }}
    - require:
      - test: Repositories configured

{%- if salt.pkg.version('kubelet') %}
Kubelet package is installed:
  test.succeed_without_changes: []
{%- else %}
Kubelet package is not installed:
  test.fail_without_changes: []
{%- endif %}

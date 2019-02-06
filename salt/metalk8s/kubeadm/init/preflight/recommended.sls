{%- from "metalk8s/map.jinja" import kubeadm_preflight with context %}

Install recommended packages:
  pkg.installed:
    - pkgs: {{ kubeadm_preflight.recommended.packages }}

{%- if salt.pkg.version('kubelet') %}
Kubelet package is installed:
  test.succeed_without_changes: []
{%- else %}
Kubelet package is not installed:
  test.fail_without_changes: []
{%- endif %}

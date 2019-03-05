{%- from "metalk8s/map.jinja" import kubeadm_preflight with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo

Install recommended packages:
  pkg.installed:
    - pkgs: {{ kubeadm_preflight.recommended.packages }}
    - fromrepo: {{ repo.repositories.keys() | list | join(',') }}

{%- if salt.pkg.version('kubelet') %}
Kubelet package is installed:
  test.succeed_without_changes: []
{%- else %}
Kubelet package is not installed:
  test.fail_without_changes: []
{%- endif %}

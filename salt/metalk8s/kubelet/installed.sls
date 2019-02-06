{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo

# TODO: Maybe not needed in offline because embedded in the kubernetes repository
Install kubelet dependencies:
  pkg.installed:
    - pkgs:
      - ebtables
      - socat
      - conntrack-tools

Install kubelet:
  pkg.installed:
    - name: kubelet
    - version: {{ repo.kubernetes.version }}
    - fromrepo: {{ repo.kubernetes.name }}
    - require:
      - pkgrepo: Configure Kubernetes repository

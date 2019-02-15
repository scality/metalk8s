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

Install and configure cri-tools:
  pkg.installed:
    - name: cri-tools
    - fromrepo: {{ repo.kubernetes.name }}
    - require:
      - pkgrepo: Configure Kubernetes repository
  file.serialize:
    - name: /etc/crictl.yaml
    - dataset:
        runtime-endpoint: unix:///run/containerd/containerd.sock
        image-endpoint: unix:///run/containerd/containerd.sock
    - merge_if_exists: true
    - user: root
    - group: root
    - mode: '0644'
    - formatter: yaml

Install kubelet:
  pkg.installed:
    - name: kubelet
    - version: {{ repo.kubernetes.version }}
    - fromrepo: {{ repo.kubernetes.name }}
    - require:
      - pkgrepo: Configure Kubernetes repository

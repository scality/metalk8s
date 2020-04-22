{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

include:
  - metalk8s.kubernetes.ca.etcd.advertised
  - .certs

Pre-pull the etcd image:
  containerd.image_managed:
    - name: {{ build_image_name('etcd') }}

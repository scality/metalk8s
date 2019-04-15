{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/registry/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import kubernetes with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}

{% set images = [
    {
        'name': 'etcd',
        'tag': '3.2.18',
    },
    {
        'name': 'coredns',
        'tag': '1.3.1',
    },
    {
        'name': 'kube-apiserver',
        'tag': kubernetes.version,
    },
    {
        'name': 'kube-controller-manager',
        'tag': kubernetes.version,
    },
    {
        'name': 'kube-proxy',
        'tag': kubernetes.version,
    },
    {
        'name': 'kube-scheduler',
        'tag': kubernetes.version,
    },
    {
        'name': 'calico-node',
        'tag': '3.5.1',
    },
    {
        'name': 'nginx',
        'tag': '1.15.8',
    },
    {
        'name': 'salt-master',
        'tag': '2018.3.4-1',
    },
    {
        'name': 'metalk8s-ui',
        'tag': '0.2',
    },
    {
        'name': 'keepalived',
        'tag': '1.3.5-8.el7_6-1',
    },
] %}

include:
  - metalk8s.repo

Install skopeo:
  {{ pkg_installed('skopeo') }}
    - require:
      - test: Repositories configured

{% for image in images %}
Import {{ image.name }} image:
  docker_registry.image_managed:
    - name: {{ build_image_name(image.name, image.tag, include_port=True) }}
    - archive_path: {{ metalk8s.iso_root_path }}/images/{{ image.name }}-{{ image.tag }}.tar.gz
    - tls_verify: false
    - require:
      - pkg: Install skopeo
{% endfor %}

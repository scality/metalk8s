{%- from "metalk8s/macro.sls" import pkg_installed with context %}

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
        'tag': '1.11.7',
    },
    {
        'name': 'kube-controller-manager',
        'tag': '1.11.7',
    },
    {
        'name': 'kube-proxy',
        'tag': '1.11.7',
    },
    {
        'name': 'kube-scheduler',
        'tag': '1.11.7',
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
        'tag': '2019.2.0-1',
    },
] %}
{% set images_path = '/srv/scality/metalk8s-2.0/images' %}

include:
  - metalk8s.repo

Install skopeo:
  {{ pkg_installed('skopeo') }}
    - require:
      - test: Repositories configured

{% for image in images %}
Import {{ image.name }} image:
  docker_registry.image_managed:
    - name: localhost:5000/metalk8s-2.0/{{ image.name }}:{{ image.tag }}
    - archive_path: /srv/scality/metalk8s-2.0/images/{{ image.name }}-{{ image.tag }}.tar.gz
    - tls_verify: false
    - require:
      - pkg: Install skopeo
{% endfor %}

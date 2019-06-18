{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{%- set repositories_name = 'repositories' %}
{%- set repositories_version = '1.0.0' %}

{%- set products = salt.metalk8s.get_products() %}

{%- set nginx_confd  = '/var/lib/metalk8s/repositories/conf.d/' %}
{%- set nginx_default_conf = nginx_confd ~ 'default.conf' %}
{%- set nginx_registry        = '99-' ~ saltenv ~ '-registry.inc' %}
{%- set nginx_registry_config = '90-' ~ saltenv ~ '-registry-config.inc' %}
{%- set nginx_registry_path        = nginx_confd ~ nginx_registry %}
{%- set nginx_registry_config_path = nginx_confd ~ nginx_registry_config %}

Generate repositories nginx configuration:
  file.managed:
    - name: {{ nginx_default_conf }}
    - source: salt://{{ slspath }}/files/nginx.conf.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false
    - defaults:
        listening_port: {{ repo.port }}

Deploy container registry nginx configuration:
  file.managed:
    - name: {{ nginx_registry_path }}
    - source: salt://{{ slspath }}/files/{{ nginx_registry }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false

Generate container registry configuration:
  file.managed:
    - name: {{ nginx_registry_config_path }}
    - source: salt://{{ slspath }}/files/99-metalk8s-registry-config.inc.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false
    - defaults:
        products: {{ products }}

Inject nginx image:
  containerd.image_managed:
    - name: docker.io/library/nginx:1.15.8
    - archive_path: {{ products[saltenv].path }}/images/nginx-1.15.8.tar

Install repositories manifest:
  metalk8s.static_pod_managed:
    - name: /etc/kubernetes/manifests/repositories.yaml
    - source: salt://{{ slspath }}/files/repositories-manifest.yaml.j2
    - config_files:
      - {{ nginx_default_conf }}
      - {{ nginx_registry_path }}
      - {{ nginx_registry_config_path }}
    - context:
        container_port: {{ repo.port }}
        image: docker.io/library/nginx:1.15.8
        name: {{ repositories_name }}
        version: {{ repositories_version }}
        products: {{ products }}
        package_path: /{{ repo.relative_path }}
        image_path: '/images/'
        nginx_confd_path: {{ nginx_confd }}
    - require:
      - containerd: Inject nginx image
      - file: Generate repositories nginx configuration
      - file: Deploy container registry nginx configuration
      - file: Generate container registry configuration

Ensure repositories container is up:
  module.wait:
    - cri.wait_container:
      - name: {{ repositories_name }}
      - state: running
    - watch:
      - file: Generate repositories nginx configuration
      - file: Deploy container registry nginx configuration
      - file: Generate container registry configuration
      - metalk8s: Install repositories manifest

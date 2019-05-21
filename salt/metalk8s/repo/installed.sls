{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{%- set repositories_name = 'repositories' %}
{%- set repositories_version = '1.0.0' %}
{%- set repositories_image = build_image_name('nginx', '1.15.8') %}

{%- set images_path = metalk8s.iso_root_path ~ '/images/' %}

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
        nginx_registry_config: {{ nginx_registry_config }}
        nginx_registry: {{ nginx_registry }}

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
    - source: salt://{{ slspath }}/files/90-metalk8s-registry-config.inc.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false
    - defaults:
        var_prefix: {{ saltenv | replace('.', '_') | replace('-', '_') }}
        images_path: {{ images_path }}

Inject nginx image:
  containerd.image_managed:
    - name: docker.io/library/nginx:1.15.8
    - archive_path: {{ metalk8s.iso_root_path }}/images/nginx-1.15.8.tar

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
        packages_path: {{ metalk8s.iso_root_path }}/{{ repo.relative_path }}
        nginx_confd_path: {{ nginx_confd }}
        images_path: {{ images_path }}
    - onchanges:
      - containerd: Inject nginx image
      - file: Generate repositories nginx configuration
      - file: Deploy container registry nginx configuration
      - file: Generate container registry configuration

Ensure repositories container is up:
  module.wait:
    - cri.wait_container:
      - name: {{ repositories_name }}
      - state: running
    - require:
      - metalk8s: Install repositories manifest

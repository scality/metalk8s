{%- from "metalk8s/registry/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{%- set package_repositories_name = 'package-repositories' %}
{%- set package_repositories_version = '1.0.0' %}
{%- set package_repositories_image = build_image_name('nginx', '1.15.8') %}
{%- set nginx_configuration_path = '/var/lib/metalk8s/package-repositories/nginx.conf' %}

Generate package repositories nginx configuration:
  file.managed:
    - name: {{ nginx_configuration_path }}
    - source: salt://{{ slspath }}/files/nginx.conf.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false
    - defaults:
        listening_port: {{ repo.port }}

Install package repositories manifest:
  metalk8s.static_pod_managed:
    - name: /etc/kubernetes/manifests/package-repositories.yaml
    - source: salt://{{ slspath }}/files/package-repositories-manifest.yaml.j2
    - config_files:
      - {{ nginx_configuration_path }}
    - context:
        container_port: {{ repo.port }}
        image: {{ package_repositories_image }}
        name: {{ package_repositories_name }}
        version: {{ package_repositories_version }}
        packages_path: {{ metalk8s.iso_root_path }}/{{ repo.relative_path }}
        nginx_configuration_path: {{ nginx_configuration_path }}
    - onchanges:
      - file: Generate package repositories nginx configuration

Ensure package repositories container is up:
  module.wait:
    - cri.wait_container:
      - name: {{ package_repositories_name }}
      - state: running
    - require:
      - metalk8s: Install package repositories manifest

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{%- set repositories_name = 'repositories' %}
{%- set repositories_version = '1.0.0' %}

{%- set products = salt.metalk8s.get_products() %}

include:
  - .configured

Inject nginx image:
  containerd.image_managed:
    - name: docker.io/library/nginx:1.15.8
    - archive_path: {{ products[saltenv].path }}/images/nginx-1.15.8.tar

Install repositories manifest:
  metalk8s.static_pod_managed:
    - name: /etc/kubernetes/manifests/repositories.yaml
    - source: salt://{{ slspath }}/files/repositories-manifest.yaml.j2
    - config_files:
      - {{ salt.file.join(repo.config.directory, repo.config.default) }}
      - {{ salt.file.join(repo.config.directory, repo.config.registry) }}
      - {{ salt.file.join(repo.config.directory, repo.config.common_registry) }}
      - {{ salt.file.join(repo.config.directory, '99-' ~ saltenv ~ '-registry.inc') }}
    - config_files_opt:
    {%- for env in products.keys() %}
      {%- if env != saltenv %}
      - {{ salt.file.join(repo.config.directory, '99-' ~ env ~ '-registry.inc') }}
      {%- endif %}
    {%- endfor %}
    - context:
        container_port: {{ repo.port }}
        image: docker.io/library/nginx:1.15.8
        name: {{ repositories_name }}
        version: {{ repositories_version }}
        products: {{ products }}
        package_path: /{{ repo.relative_path }}
        image_path: '/images/'
        nginx_confd_path: {{ repo.config.directory }}
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

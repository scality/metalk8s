{%- from "metalk8s/map.jinja" import repo with context %}

{%- set repositories_name = 'repositories' %}
{%- set repositories_version = '1.0.0' %}

{%- set archives = salt.metalk8s.get_archives() %}
{%- set solutions = pillar.metalk8s.get('solutions', {}).get('deployed', {}) %}

{%- set docker_repository = 'docker.io/library' %}
{%- set image_name = 'nginx' %}

{%- set image_version = repo.images.get(image_name, {}).get('version') %}
{%- if not image_version %}
  {{ raise('Missing version information for "nginx"') }}
{%- endif %}

{%- set image_fullname = docker_repository ~ '/' ~ image_name ~ ':' ~ image_version %}

include:
  - .configured

Inject nginx image:
  containerd.image_managed:
    - name: {{ image_fullname }}
    - archive_path: {{ archives[saltenv].path }}/images/{{ image_name }}-{{ image_version }}.tar

Install repositories manifest:
  metalk8s.static_pod_managed:
    - name: /etc/kubernetes/manifests/repositories.yaml
    - source: salt://{{ slspath }}/files/repositories-manifest.yaml.j2
    - config_files:
      - {{ salt.file.join(repo.config.directory, repo.config.default) }}
      - {{ salt.file.join(repo.config.directory, repo.config.registry) }}
      - {{ salt.file.join(repo.config.directory, repo.config.common_registry) }}
      - {{ salt.file.join(repo.config.directory, '99-' ~ saltenv ~ '-registry.inc') }}
    {%- for name, versions in solutions.items() | sort(attribute='0') %}
      {%- for version_info in versions | sort(attribute='version') %}
      - {{ salt.file.join(repo.config.directory,
                          name ~ '-' ~ version_info.version ~ '-registry-config.inc') }}
      {%- endfor %}
    {%- endfor %}
    - config_files_opt:
    {%- for env in archives.keys() %}
      {%- if env != saltenv %}
      - {{ salt.file.join(repo.config.directory, '99-' ~ env ~ '-registry.inc') }}
      {%- endif %}
    {%- endfor %}
    - context:
        container_port: {{ repo.port }}
        image: {{ image_fullname }}
        name: {{ repositories_name }}
        version: {{ repositories_version }}
        archives: {{ archives }}
        solutions: {{ solutions }}
        package_path: /{{ repo.relative_path }}
        image_path: '/images/'
        nginx_confd_path: {{ repo.config.directory }}
    - require:
      - containerd: Inject nginx image
      - file: Generate repositories nginx configuration
      - file: Deploy container registry nginx configuration
      - file: Generate container registry configuration

Delay after new nginx pod deployment:
  module.wait:
    - test.sleep:
      - length: 10
    - watch:
      - metalk8s: Install repositories manifest

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
      - module: Delay after new nginx pod deployment

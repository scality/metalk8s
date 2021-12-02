{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- set repositories_name = 'repositories' %}
{%- set repositories_version = '1.0.0' %}

{%- set archives = salt.metalk8s.get_archives() %}
{%- set solutions = pillar.metalk8s.get('solutions', {}).get('available', {}) %}

{%- set image_name = 'nginx' %}

{%- set image_version = repo.images.get(image_name, {}).get('version') %}
{%- if not image_version %}
  {{ raise('Missing version information for "' ~ image_name ~ '"') }}
{%- endif %}

{%- set image_fullname = build_image_name(image_name) %}

include:
  - .configured
  - metalk8s.container-engine.running

# We really need to inject those images only for the first registry as for others nodes
# those images are available from remote MetalK8s registry
Inject pause image:
  containerd.image_managed:
    - name: {{ build_image_name("pause") }}
    - archive_path: {{ archives[saltenv].path }}/images/pause-{{ repo.images.pause.version }}.tar
    - require:
      - sls: metalk8s.container-engine.running

Inject nginx image:
  containerd.image_managed:
    - name: {{ image_fullname }}
    - archive_path: {{ archives[saltenv].path }}/images/{{ image_name }}-{{ image_version }}.tar
    - require:
      - sls: metalk8s.container-engine.running

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
      {%- for info in versions | sort(attribute='version') %}
      - {{ salt.file.join(repo.config.directory,
                          info.id ~ '-registry-config.inc') }}
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
        archives: {{ archives | tojson }}
        solutions: {{ solutions | tojson }}
        package_path: /{{ repo.relative_path }}
        image_path: '/images/'
        nginx_confd_path: {{ repo.config.directory }}
        probe_host: {{ grains.metalk8s.control_plane_ip }}
    - require:
      - containerd: Inject nginx image
      - file: Generate repositories nginx configuration
      - file: Deploy container registry nginx configuration
      - file: Generate container registry configuration

Delay after repositories pod deployment:
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
      - timeout: 180
    - watch:
      - file: Generate repositories nginx configuration
      - file: Deploy container registry nginx configuration
      - file: Generate container registry configuration
      - metalk8s: Install repositories manifest
    - require:
      - module: Delay after repositories pod deployment

Wait for Repositories container to answer:
  http.wait_for_successful_query:
   - name: http://{{ grains.metalk8s.control_plane_ip }}:{{
     repo.port }}/{{ saltenv }}/
   - status: 200
   - require:
     - module: Ensure repositories container is up

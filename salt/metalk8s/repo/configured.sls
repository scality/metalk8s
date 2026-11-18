{%- from "metalk8s/map.jinja" import repo with context %}

{%- set archives = salt.metalk8s.get_archives() %}

Generate repositories nginx configuration:
  file.managed:
    - name: {{ salt.file.join(repo.config.directory, repo.config.default) }}
    - source: salt://{{ slspath }}/files/nginx.conf.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false
    - defaults:
        listening_address: {{ grains.metalk8s.control_plane_ip }}
        listening_port: {{ repo.port }}
        archives: {{ archives | tojson }}
        package_path: /{{ repo.relative_path }}

Deploy common container registry nginx configuration:
  file.managed:
    - name: {{ salt.file.join(repo.config.directory, repo.config.common_registry) }}
    - source: salt://{{ slspath }}/files/metalk8s-registry-common.inc
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false

{%- set existing_includes = salt.file.find(
      repo.config.directory,
      type="f",
      regex="99-metalk8s-[0-9].*"
    ) %}

{#- MetalK8s images are served by the registry operator: only Solutions
    still get a registry configuration here. #}
{%- for inc in existing_includes %}

Remove MetalK8s registry configuration '{{ inc }}':
    file.absent:
      - name: {{ inc }}

{% endfor %}

Remove MetalK8s registry variables:
  file.absent:
    - name: {{ salt.file.join(repo.config.directory, repo.config.registry) }}

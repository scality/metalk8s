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

Deploy common container registry nginx configuration:
  file.managed:
    - name: {{ salt.file.join(repo.config.directory, repo.config.common_registry) }}
    - source: salt://{{ slspath }}/files/metalk8s-registry-common.inc
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false

Deploy container registry nginx configuration:
  file.managed:
    - name: {{ salt.file.join(repo.config.directory, '99-' ~ saltenv ~ '-registry.inc') }}
    - source: salt://{{ slspath }}/files/metalk8s-registry.inc
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false

Generate container registry configuration:
  file.managed:
    - name: {{ salt.file.join(repo.config.directory, repo.config.registry) }}
    - source: salt://{{ slspath }}/files/metalk8s-registry-config.inc.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false
    - defaults:
        archives: {{ archives }}

{%- set existing_includes = salt.file.find(
      repo.config.directory,
      type="f",
      regex="99-metalk8s-[0-9].*"
    ) %}

{%- set expected_includes = [] %}
{%- for env in archives %}
  {%- do expected_includes.append(
        salt.file.join(repo.config.directory, '99-' ~ env ~ '-registry.inc')
      ) %}
{%- endfor %}

{%- for inc in existing_includes %}
  {%- if inc not in expected_includes %}

Remove unexpected version-specific configuration '{{ inc }}':
    file.absent:
      - name: {{ inc }}

  {%- endif %}
{% endfor %}

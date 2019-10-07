{%- from "metalk8s/map.jinja" import repo with context %}

{%- if 'archives' in pillar %}
  {# Allow passing an explicit list of archives to mount, for CLI control. #}
  {%- set archives = pillar.archives %}
{%- else %}
  {%- set archives = pillar.metalk8s.solutions.configured %}
{%- endif %}

{%- if archives %}
  {%- for archive in archives %}
    {%- set solution = salt['metalk8s.archive_info_from_iso'](archive) %}
    {%- set lower_name = solution.name | lower | replace(' ', '-') %}
    {%- set full_name = lower_name ~ '-' ~ solution.version %}
    {%- set mount_path = "/srv/scality/" ~ full_name %}
Expose container images for Solution {{ full_name }}:
  file.managed:
    - source: {{ mount_path }}/registry-config.inc.j2
    - name: {{ repo.config.directory }}/{{ full_name }}-registry-config.inc
    - template: jinja
    - defaults:
      repository: {{ full_name }}
      registry_root: {{ mount_path }}/images
{# TODO: trigger re-run of metalk8s.repo.installed #}

{%- endfor %}
{%- else %}
No selected Solution to configure:
  test.succeed_without_changes:
    - name: Nothing to do
{% endif %}

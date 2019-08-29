{%- set solutions_list = pillar.metalk8s.solutions.configured %}
{%- if solutions_list %}
{%- for solution_iso in solutions_list %}
  {%- set solution = salt['metalk8s.product_info_from_iso'](solution_iso) %}
  {%- set lower_name = solution.name | lower | replace(' ', '-') %}
  {%- set full_name = lower_name ~ '-' ~ solution.version %}
  {%- set path = "/srv/scality/" ~ full_name %}
Configure nginx for Solution {{ full_name }}:
  file.managed:
    - source: {{ path }}/registry-config.inc.j2
    - name: /var/lib/metalk8s/repositories/conf.d/{{ full_name }}-registry-config.inc
    - template: jinja
    - defaults:
      repository: {{ full_name }}
      registry_root: {{ path }}/images

{%- endfor %}
{%- else %}
No configured Solution:
  test.succeed_without_changes:
    - name: Nothing to do
{% endif %}

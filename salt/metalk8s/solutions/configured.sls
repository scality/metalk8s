{%- set solutions_list = pillar.metalk8s.solutions.configured %}
{%- if solutions_list %}
{%- for solution_iso in solutions_list %}
  {%- set solution = salt['metalk8s.product_info_from_iso'](solution_iso) %}
  {%- set solution_name = solution.name | lower | replace(' ', '-') %}
  {%- set path = "/srv/scality/" ~ solution_name ~ "-" ~ solution.version %}
Configure nginx for solution {{ solution_name }}-{{ solution.version }}:
  file.managed:
    - source: {{ path }}/registry-config.inc.j2
    - name: /var/lib/metalk8s/repositories/conf.d/{{solution_name}}-{{ solution.version }}-registry-config.inc
    - template: jinja
    - defaults:
      repository: {{ solution_name }}
      registry_root: {{ path }}/images
{%- endfor %}
{%- else %}
No unconfigured solutions detected:
  test.succeed_without_changes:
    - name: All solutions are configured
{% endif %}

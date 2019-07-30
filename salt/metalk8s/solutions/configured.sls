{%- set solutions_list = pillar.metalk8s.solutions.unconfigured %}
{%- if solutions_list %}
{%- for solution_iso in solutions_list %}
  {%- set solution = salt['metalk8s.product_info_from_iso'](solution_iso) %}
  {%- set path = "/srv/scality/" ~ solution.name ~ "-" ~ solution.version %}
Configure nginx for solution {{ solution.name }}:
  file.managed:
    - source: {{ path }}/registry-config.inc.j2
    - name: /var/lib/metalk8s/repositories/conf.d/{{solution.name}}-{{ solution.version }}-registry-config.inc
    - template: jinja
    - defaults:
      repository: {{ solution.name }}
      registry_root: {{ path }}/images
{%- endfor %}
{%- else %}
No unconfigured solutions detected:
  test.succeed_without_changes:
    - name: All solutions are configured
{% endif %}

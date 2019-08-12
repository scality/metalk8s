
{%- set solutions_list = pillar.metalk8s.solutions.configured %}
{%- if solutions_list %}
{%- for solution_iso in solutions_list %}
  {%- set solution = salt['metalk8s.product_info_from_iso'](solution_iso) %}
  {%- set lower_name = solution.name | lower | replace(' ', '-') %}
  {%- set full_name = lower_name ~ '-' ~ solution.version %}
  {%- set path = "/srv/scality/" ~ full_name %}
Solution mountpoint {{ path }} exists:
  file.directory:
  - name: {{ path }}
  - makedirs: true

Solution {{ solution_iso }} is available at {{ path }}:
  mount.mounted:
  - name: {{ path }}
  - device: {{ solution_iso }}
  - fstype: iso9660
  - mkmnt: false
  - opts:
    - ro
    - nofail
  - persist: true
  - match_on:
    - name
  - require:
    - file: Solution mountpoint {{ path }} exists

#  Validate solution structure
Assert '{{ path }}/product.txt' exists:
  file.exists:
  - name: {{ path }}/product.txt
  - require:
    - mount: Solution {{ solution_iso }} is available at {{ path }}


Assert '{{ path }}/images' exists:
  file.exists:
  - name: {{ path }}/images
  - require:
    - mount: Solution {{ solution_iso }} is available at {{ path }}

Assert '{{ path }}/operator/deploy' exists:
  file.exists:
  - name: {{ path }}/operator/deploy
  - require:
    - mount: Solution {{ solution_iso }} is available at {{ path }}

{%- endfor %}
{% else %}
No configured Solution:
  test.succeed_without_changes:
    - name: Nothing to do
{% endif %}
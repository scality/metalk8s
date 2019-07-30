
{%- set solutions_list = pillar.metalk8s.solutions.unconfigured %}
{%- if solutions_list %}
{%- for solution_iso in solutions_list %}
  {%- set solution = salt['metalk8s.product_info_from_iso'](solution_iso) %}
  {%- set path = "/srv/scality/" ~ solution.name ~ "-" ~ solution.version %}


Solution path {{ path }} exists:
  file.directory:
  - name: {{ path }}
  - makedirs: true

Solution {{ solution_iso }} available at {{ path }}:
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
    - file: Solution path {{ path }} exists
  - require_in:
    - file: Assert '{{ path }}/product.txt' exists
    - file: Assert '{{ path }}/images' exists
    - file: Assert '{{ path }}/operator/deploy' exists

#  Validate solution structure
Assert '{{ path }}/product.txt' exists:
  file.exists:
  - name: {{ path }}/product.txt

Assert '{{ path }}/images' exists:
  file.exists:
    - name: {{ path }}/images

Assert '{{ path }}/operator/deploy' exists:
  file.exists:
    - name: {{ path }}/operator/deploy

{%- endfor %}
{% else %}
No unconfigured solutions detected:
  test.succeed_without_changes:
    - name: All solutions are configured
{% endif %}
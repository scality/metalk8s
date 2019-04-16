{% set products = ['/srv/scality/metalk8s-2.0', '/etc/hosts'] %}
{% set base = '/srv/scality' %}
{% set roots_file = '/etc/salt/master.d/99-metalk8s-roots.conf' %}

{% for product in products %}
{%   if salt['file.file_exists'](product) %}
{%     set product_version = salt['metalk8s.product_version_from_iso'](product) %}
{%     if not product_version %}
{%         set product_path = product %}
{%         set product_version = 'unknown' %}
{%         set product_path_available = "- test: Product " ~ product ~ " available" %}
Product {{ product }} available:
  test.configurable_test_state:
  - changes: false
  - result: false
  - comment: >
      Unable to retrieve product version from given product file {{ product }},
      assumed to be an ISO archive containing a "product.txt" file.

{%     else %}
{%         set product_path = base ~ '/metalk8s-' ~ product_version %}
{%         set product_path_available = "- mount: Product " ~ product ~ " available at " ~ product_path %}
Product path {{ product_path }} exists:
  file.directory:
  - name: {{ product_path }}
  - mode: 0755
  - makedirs: true

Product {{ product }} available at {{ product_path }}:
  mount.mounted:
  - name: {{ product_path }}
  - device: {{ product }}
  - fstype: iso9660
  - mkmnt: false
  - opts: ro
  - require:
    - file: Product path {{ product_path }} exists
{%     endif %} {# product_version is not None #}
{%   else %}
{%     set product_version = salt['metalk8s.product_version_from_tree'](product) %}
{%     set product_path = product %}
{%     set product_path_available = "- file: Product " ~ product ~ " available" %}
Product {{ product }} available:
  file.exists:
  - name: {{ product_path }}
{%   endif %}

Assert '{{ product_path }}/product.txt' exists:
  file.exists:
  - name: {{ product_path }}/product.txt
  - require:
    {{ product_path_available }}

Assert product '{{ product }}' is MetalK8s:
  cmd.run:
  - name: grep '^NAME=MetalK8s$' {{ product_path }}/product.txt > /dev/null
  - stateful: true
  - require:
    - file: Assert '{{ product_path }}/product.txt' exists

{%   for (root, subdir) in [('file_roots', 'salt'), ('pillar_roots', 'pillar')] %}
Expose Salt '{{ root }}' for {{ product_path }}:
  file.serialize:
  - name: {{ roots_file }}
  - dataset:
      {{ root }}:
        metalk8s-{{ product_version }}:
        - {{ product_path }}/{{ subdir }}
  - formatter: yaml
  - backup: false
  - merge_if_exists: true
  - onlyif:
    - test -d "{{ product_path }}/{{ subdir }}"
  - require:
    - cmd: Assert product '{{ product }}' is MetalK8s
{%   endfor %} {# (root, subdir ) #}

{% endfor %} {# product in products #}

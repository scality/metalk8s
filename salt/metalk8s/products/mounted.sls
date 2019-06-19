include:
  - metalk8s.salt.minion.local

{%- for _, product in salt.metalk8s.get_products().items() %}
  {%- if product.iso %}
    {%- if not product.version %}

Product {{ product.iso }} available:
  test.configurable_test_state:
  - changes: false
  - result: false
  - comment: >
      Unable to retrieve product version from given product file 
      {{ product.iso }}, assumed to be an ISO archive containing a 
      "product.txt" file.

    {%- else %}

Product path {{ product.path }} exists:
  file.directory:
  - name: {{ product.path }}
  - makedirs: true

Product {{ product.iso }} available at {{ product.path }}:
  mount.mounted:
  - name: {{ product.path }}
  - device: {{ product.iso }}
  - fstype: iso9660
  - mkmnt: false
  - opts:
    - ro
    - nofail
  - persist: true
  - match_on:
    - name
  - require:
    - file: Product path {{ product.path }} exists
  - require_in:
    - file: Assert '{{ product.path }}/product.txt' exists

    {%- endif %}

  {%- endif %}

Assert '{{ product.path }}/product.txt' exists:
  file.exists:
  - name: {{ product.path }}/product.txt

Assert product '{{ product.path }}' is MetalK8s:
  cmd.run:
  - name: grep '^NAME=MetalK8s$' {{ product.path }}/product.txt > /dev/null
  - stateful: true
  - require:
    - file: Assert '{{ product.path }}/product.txt' exists

{%- endfor %}

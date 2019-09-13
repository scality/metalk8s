include:
  - metalk8s.salt.minion.local

{%- for _, archive in salt.metalk8s.get_archives().items() %}
  {%- if archive.iso %}
    {%- if not archive.version %}

Archive {{ archive.iso }} available:
  test.configurable_test_state:
  - changes: false
  - result: false
  - comment: >
      Unable to retrieve archive version from given archive file 
      {{ archive.iso }}, assumed to be an ISO archive containing a 
      "product.txt" file.

    {%- else %}

Archive path {{ archive.path }} exists:
  file.directory:
  - name: {{ archive.path }}
  - makedirs: true

Archive {{ archive.iso }} available at {{ archive.path }}:
  mount.mounted:
  - name: {{ archive.path }}
  - device: {{ archive.iso }}
  - fstype: iso9660
  - mkmnt: false
  - opts:
    - ro
    - nofail
  - persist: true
  - match_on:
    - name
  - require:
    - file: Archive path {{ archive.path }} exists
  - require_in:
    - file: Assert '{{ archive.path }}/product.txt' exists

    {%- endif %}

  {%- endif %}

Assert '{{ archive.path }}/product.txt' exists:
  file.exists:
  - name: {{ archive.path }}/product.txt

Assert archive '{{ archive.path }}' is MetalK8s:
  cmd.run:
  - name: grep '^NAME=MetalK8s$' {{ archive.path }}/product.txt > /dev/null
  - stateful: true
  - require:
    - file: Assert '{{ archive.path }}/product.txt' exists

{%- endfor %}

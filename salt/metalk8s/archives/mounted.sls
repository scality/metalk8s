include:
  - metalk8s.salt.minion.local

{%- for archive in salt.metalk8s.get_archives().values() | selectattr("iso") %}

Create archive mountpoint '{{ archive.path }}':
  file.directory:
  - name: {{ archive.path }}
  - makedirs: true

Mount '{{ archive.iso }}' at '{{ archive.path }}':
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
    - file: Create archive mountpoint '{{ archive.path }}'

{%- endfor %}

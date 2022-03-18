{# Remove mounted ISOs which were removed from configuration #}
{%- set desired = salt.metalk8s.get_archives() %}
{%- set available = salt.metalk8s.get_mounted_archives() %}
{%- set ns = namespace(found_archives_to_remove=false) %}

{%- for env, archive in available.items() %}
  {%- if env not in desired %}
    {%- set ns.found_archives_to_remove = true %}

Unmount '{{ archive.iso }}' from '{{ archive.path }}':
  mount.unmounted:
    - name: {{ archive.path }}
    - device: {{ archive.iso }}
    - persist: true

Remove archive mountpoint '{{ archive.path }}':
  file.absent:
    - name: {{ archive.path }}
    - unless:
      - fun: file.path_exists_glob
        path: {{ archive.path }}/*
    - require:
      - mount: Unmount '{{ archive.iso }}' from '{{ archive.path }}'

Ensure mountpoint '{{ archive.path }}' is empty:
  test.configurable_test_state:
    - changes: false
    - warnings: >-
        Mountpoint '{{ archive.path }}', for the unmounted archive
        '{{ archive.iso }}', is not empty and cannot be removed.
    - onlyif:
      - fun: file.path_exists_glob
        path: {{ archive.path }}/*
    - require:
      - file: Remove archive mountpoint '{{ archive.path }}'

  {%- endif %}
{%- endfor %}

{%- if not ns.found_archives_to_remove %}
No archive to unmount:
  test.nop: []
{%- endif %}

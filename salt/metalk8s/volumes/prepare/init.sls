include:
  - .installed

{%- set volumes = pillar.metalk8s.volumes %}
{%- set volume_name = pillar['volume'] %}

{%- if volume_name in volumes.keys() %}
Create the sparse file directory:
  file.directory:
    - name: /var/lib/metalk8s/storage/sparse/
    - makedirs: True

Create backing storage for {{ volume_name }}:
  metalk8s_volumes.present:
    - volume: {{ volume_name }}
    - require:
      - file: Create the sparse file directory

Initialize backing storage for {{ volume_name }}:
  metalk8s_volumes.initialized:
    - volume: {{ volume_name }}
    - require:
      - metalk8s_volumes: Create backing storage for {{ volume_name }}

Format backing storage for {{ volume_name }}:
  metalk8s_volumes.formatted:
    - volume: {{ volume_name }}
    - require:
      - metalk8s_package_manager: Install e2fsprogs
      - metalk8s_package_manager: Install xfsprogs
      - metalk8s_volumes: Initialize backing storage for {{ volume_name }}
{%- else %}
Volume "{{ volume_name }}" not found in pillar:
  test.fail_without_changes: []
{%- endif %}

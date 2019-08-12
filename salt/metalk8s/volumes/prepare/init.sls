include:
  - .installed

{%- set volumes = pillar.metalk8s.volumes %}
{%- set volume_name = pillar['volume'] %}
{%- if volume_name in volumes.keys() %}
  {%- set volume_info = volumes[volume_name] %}
  {%- set storage_class = volume_info['spec']['storageClassName'] %}
  {%- if 'sparseLoopDevice' in volume_info['spec'].keys() %}
    {%- set capacity = volume_info['spec']['sparseLoopDevice']['size'] %}
    {%- set path = '/var/lib/metalk8s/storage/sparse/' ~ volume_name %}
    {%- set uuid = volume_info['metadata']['uid'] %}
    {%- set fs_type = storage_class['parameters']['fsType'] %}
    {%- set mkfs_options = storage_class['parameters']['mkfsOptions'] | load_json %}

Create the sparse file directory:
  file.directory:
    - name: /var/lib/metalk8s/storage/sparse/
    - makedirs: True

Create the backing sparse file for {{ volume_name }}:
  metalk8s_volumes.sparse_file_present:
    - path: {{ path }}
    - capacity: {{ capacity }}
    - require:
      - file: Create the sparse file directory

Setup loop device for {{ volume_name }}:
  metalk8s_volumes.sparse_loop_initialized:
    - path: {{ path }}
    - require:
      - metalk8s_volumes: Create the backing sparse file for {{ volume_name }}

Format {{ volume_name }}:
  cmd.run:
    - name: mkfs -t {{ fs_type }} -U {{ uuid }} {{ mkfs_options | join (' ') }} $(losetup -j {{ path }} | cut -f 1 -d:)
    - unless:
      -  blkid {{ path }} | grep {{ fs_type }}
    - failhard: True
    - require:
      - metalk8s_package_manager: Install e2fsprogs
      - metalk8s_package_manager: Install xfsprogs
      - metalk8s_volumes: Setup loop device for {{ volume_name }}
  {%- endif %}
{%- else %}
Volume "{{ volume_name }}" not found in pillar:
  test.fail_without_changes: []
{%- endif %}

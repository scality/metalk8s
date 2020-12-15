include:
  - .installed

{%- set volumes_to_create = [] %}
{%- set all_volumes = pillar.metalk8s.volumes %}
{%- set target_volume_name = pillar.get('volume') %}

{#- If a volume is given we only take this one, otherwise we take them all. #}
{%- if target_volume_name is not none %}
  {%- set target_volume = all_volumes.get(target_volume_name) %}
  {%- if target_volume is not none %}
    {%- do volumes_to_create.append(target_volume) %}
  {%- else %}
Volume {{ target_volume_name }} not found in pillar:
  test.configurable_test_state:
    - name: {{ target_volume_name }}
    - changes: False
    - result: False
    - comment: Volume {{ target_volume_name }} not found in pillar
  {%- endif %}
{%- else %}
    {%- do volumes_to_create.extend(all_volumes.values()|list) %}
{%- endif %}


{%- for volume in volumes_to_create %}
  {%- set volume_name = volume.metadata.name %}

Create backing storage for {{ volume_name }}:
  metalk8s_volumes.present:
    - name: {{ volume_name }}
    - require:
      - file: Create the sparse file directory

Prepare backing storage for {{ volume_name }}:
  metalk8s_volumes.prepared:
    - name: {{ volume_name }}
    - require:
      - metalk8s_package_manager: Install e2fsprogs
      - metalk8s_package_manager: Install xfsprogs
      - metalk8s_package_manager: Install gdisk
      - metalk8s_volumes: Create backing storage for {{ volume_name }}
  {%- if 'sparseLoopDevice' in volume.spec %}

Provision backing storage for {{ volume_name }}:
  service.running:
    - name: metalk8s-sparse-volume@{{ volume.metadata.uid }}
    - enable: true
    - require:
      - metalk8s_volumes: Prepare backing storage for {{ volume_name }}
      - file: Set up systemd template unit for sparse loop device provisioning
      - test: Ensure Python 3 is available
  {%- endif %}
    - require_in:
      - module: Update pillar after volume provisioning

{%- endfor %}

{%- if volumes_to_create %}

Update pillar after volume provisioning:
  module.run:
    - saltutil.refresh_pillar:
      - wait: True

{%- else %}

No volume to create:
  test.succeed_without_changes: []

{%- endif %}

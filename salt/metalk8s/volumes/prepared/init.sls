include:
  - .installed

{%- set volumes_to_create = [] %}
{%- set all_volumes = pillar.metalk8s.volumes %}
{%- set target_volume = pillar.get('volume') %}

{#- If a volume is given we only take this one, otherwise we take them all. #}
{%- if target_volume is not none %}
  {%- if target_volume in all_volumes.keys() %}
    {%- do volumes_to_create.append(target_volume) %}
  {%- else %}
Volume "{{ target_volume }}" not found in pillar:
  test.fail_without_changes: []
  {%- endif %}
{%- else %}
    {%- do volumes_to_create.extend(all_volumes.keys()|list) %}
{%- endif %}

Create the sparse file directory:
  file.directory:
    - name: /var/lib/metalk8s/storage/sparse/
    - makedirs: True

{%- for volume in volumes_to_create %}

Create backing storage for {{ volume }}:
  metalk8s_volumes.present:
    - name: {{ volume }}
    - require:
      - file: Create the sparse file directory

Format backing storage for {{ volume }}:
  metalk8s_volumes.formatted:
    - name: {{ volume }}
    - require:
      - metalk8s_package_manager: Install e2fsprogs
      - metalk8s_package_manager: Install xfsprogs
      - metalk8s_volumes: Create backing storage for {{ volume }}

Provision backing storage for {{ volume }}:
  metalk8s_volumes.provisioned:
    - name: {{ volume }}
    - require:
      - metalk8s_volumes: Format backing storage for {{ volume }}

{%- endfor %}

{%- set volumes = pillar.metalk8s.volumes %}
{%- set volume_name  = pillar.get('volume', '') %}
{%- set to_remove = volumes.get(volume_name) %}

{%- if to_remove is not none %}
  {%- if 'sparseLoopDevice' in to_remove.spec %}
Disable systemd provisioning of loop device for {{ volume_name }}:
  service.dead:
    - name: metalk8s-sparse-volume@{{ to_remove.metadata.uid }}
    - enable: false
    - require_in:
      - metalk8s_volumes: Clean up backing storage for {{ volume_name }}

  {%- endif %}
Clean up backing storage for {{ volume_name }}:
  metalk8s_volumes.removed:
    - name: {{ volume_name }}
{%- else %}

{%- do salt.log.warning('Volume ' ~ volume_name ~ ' not found in pillar') -%}

Volume {{ volume_name }} not found in pillar:
  test.configurable_test_state:
    - name: {{ volume_name }}
    - changes: False
    - result: True
    - comment: Volume {{ volume_name }} not found in pillar
{%- endif %}

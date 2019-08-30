{%- set volumes = pillar.metalk8s.volumes %}
{%- set volume  = pillar.get('volume', '') %}


{%- if volume in volumes.keys() %}
Clean up backing storage for {{ volume }}:
  metalk8s_volumes.removed:
    - name: {{ volume }}
{%- else %}
Volume "{{ volume }}" not found in pillar:
  test.succeed_without_changes: []
{%- endif %}

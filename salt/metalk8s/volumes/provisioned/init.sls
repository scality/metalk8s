{%- for volume in pillar.metalk8s.volumes.keys() %}

Provision backing storage for {{ volume }}:
  metalk8s_volumes.provisioned:
    - name: {{ volume }}
    - parallel: True

{%- endfor %}

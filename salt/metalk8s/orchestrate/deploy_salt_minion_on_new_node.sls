{%- if pillar['bootstrap_id'] %}
{%-   set control_plane_ips = salt.saltutil.runner('mine.get', tgt=pillar['bootstrap_id'], fun='control_plane_ip') %}
{%- else %}
{%-   set control_plane_ips = {} %}
{%- endif %}

{%- if pillar['bootstrap_id'] in control_plane_ips.keys() and control_plane_ips[pillar['bootstrap_id']] %}
{%-   set control_plane_ip = control_plane_ips[pillar['bootstrap_id']] %}
{%- else %}
{%-   set control_plane_ip = 'localhost' %}
{%- endif %}

Deploy salt-minion on a new node:
  salt.state:
    - ssh: true
    - roster: kubernetes
    - tgt: {{ pillar['node_name'] }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.salt.minion.configured
    - pillar:
        repo:
          online_mode: false
          local_mode: false
          host: {{ control_plane_ip }}
        salt:
          master:
            host: {{ control_plane_ip }}

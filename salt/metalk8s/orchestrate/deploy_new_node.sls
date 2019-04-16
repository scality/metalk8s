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
      - metalk8s.roles.minion
    - pillar:
        repo:
          host: {{ control_plane_ip }}
        salt:
          master:
            host: {{ control_plane_ip }}

Accept key:
  salt.state:
    - tgt: {{ pillar['bootstrap_id'] }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.salt.master.accept_keys
    - require:
      - salt: Deploy salt-minion on a new node

Set grains:
  salt.state:
    - tgt: {{ pillar['node_name'] }}
    - sls:
      - metalk8s.node.grains
    - require:
      - salt: Accept key

Refresh the mine:
  salt.function:
    - name: mine.update
    - tgt: '*'

Run the highstate:
  salt.state:
    - tgt: {{ pillar['node_name'] }}
    - highstate: True
    - require:
      - salt: Set grains
      - salt: Refresh the mine

{%- if 'etcd' in pillar.get('metalk8s', {}).get('nodes', {}).get(pillar['node_name'], {}).get('roles', []) %}

  {%- set node_ip = grains['metalk8s']['control_plane_ip'] %}

  {#- etcd endpoint of the new node. #}
  {%- set endpoint = 'https://' ~ node_ip ~ ':2380' %}

Register the node into etcd cluster:
  module.run:
    - metalk8s.add_etcd_node:
      - host: {{ pillar['node_name'] }}
      - endpoint: {{ endpoint }}
    - require:
      - salt: Run the highstate

{%- endif %}

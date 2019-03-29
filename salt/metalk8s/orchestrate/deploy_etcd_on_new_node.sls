{%- set control_plane_ips = salt.saltutil.runner('mine.get', tgt='*', fun='control_plane_ips') %}

{%- if pillar['bootstrap_id'] in control_plane_ips.keys() and control_plane_ips[pillar['bootstrap_id']] %}
{%- set bootstrap_ip = control_plane_ips[pillar['bootstrap_id']][0] %}
{%- else %}
{%- set bootstrap_ip = 'localhost' %}
{%- endif %}

{%- if pillar['node_name'] in control_plane_ips.keys() and control_plane_ips[pillar['node_name']] %}
{%- set node_ip = control_plane_ips[pillar['node_name']][0] %}
{%- else %}
{%- set node_ip = 'localhost' %}
{%- endif %}

{#- etcd endpoint of the new node. #}
{%- set endpoint  = 'https://' ~ node_ip ~ ':2380' %}

Generate etcd certificates on a new node:
  salt.state:
    - tgt: {{ pillar['node_name'] }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.kubeadm.init.certs.etcd-server
      - metalk8s.kubeadm.init.certs.etcd-peer
      - metalk8s.kubeadm.init.certs.etcd-healthcheck-client
    - pillar:
        repo:
          online_mode: false
          local_mode: false
          host: {{ bootstrap_ip }}
        registry_ip: {{ bootstrap_ip }}

Refresh the list of etcd nodes:
  salt.function:
    - name: mine.update
    - tgt: '*'

Deploy the new etcd node:
  salt.state:
    - tgt: {{ pillar['node_name'] }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.bootstrap.etcd
    - pillar:
        repo:
          online_mode: false
          local_mode: false
          host: {{ bootstrap_ip }}
        registry_ip: {{ bootstrap_ip }}
    - require:
      - salt: Generate etcd certificates on a new node
      - salt: Refresh the list of etcd nodes

Register the node into etcd cluster:
  module.run:
    - metalk8s.add_etcd_node:
      - host: {{ pillar['node_name'] }}
      - endpoint: {{ endpoint }}
    - pillar:
        repo:
          online_mode: false
          local_mode: false
          host: {{ bootstrap_ip }}
        registry_ip: {{ bootstrap_ip }}
    - require:
      - salt: Deploy the new etcd node

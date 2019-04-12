{%- set control_plane_ips = salt.saltutil.runner('mine.get', tgt='*', fun='control_plane_ip') %}

{% set control_plane_ip = control_plane_ips.get(pillar['bootstrap_id']) | default('localhost', true) %}
{% set node_ip = grains['metalk8s']['control_plane_ip'] %}

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

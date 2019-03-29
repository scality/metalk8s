{#- etcd endpoint of the new node. #}
{%- set endpoint  = 'https://' ~ pillar['node_ip'] ~ ':2380' %}

Generate etcd certificates on a new node:
  salt.state:
    - tgt: {{ pillar['node_name'] }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.kubeadm.init.certs.etcd-server
      - metalk8s.kubeadm.init.certs.etcd-peer
      - metalk8s.kubeadm.init.certs.etcd-healthcheck-client

Refresh the list of etcd nodes:
  module.wait:
    - mine.update:
      - mine_functions: metalk8s.get_etcd_endpoint

Deploy the new etcd node:
  salt.state:
    - tgt: {{ pillar['node_name'] }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.bootstrap.etcd
    - require:
      - salt: Generate etcd certificates on a new node
      - module: Refresh the list of etcd nodes

Register the node into etcd cluster:
  module.wait:
    - metalk8s.add_etcd_node:
      - host: {{ pillar['node_name'] }}
      - endpoint: {{ endpoint }}
    - require:
      - salt: Deploy the new etcd node

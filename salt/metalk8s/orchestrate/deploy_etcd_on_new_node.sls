{%- set control_plane_ips = salt.saltutil.runner('mine.get', tgt='*', fun='control_plane_ips') %}

{%- if pillar['bootstrap_id'] in control_plane_ips.keys() and control_plane_ips[pillar['bootstrap_id']] %}
{%- set bootstrap_ip = control_plane_ips[pillar['bootstrap_id']][0] %}
{%- else %}
{%- set bootstrap_ip = 'localhost' %}
{%- endif %}

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

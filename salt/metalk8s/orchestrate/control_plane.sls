{%- set control_plane_ips = salt.saltutil.runner('mine.get', tgt='*', fun='control_plane_ips') %}
{%- if pillar['bootstrap_id'] in control_plane_ips.keys() and control_plane_ips[pillar['bootstrap_id']] %}
{%- set control_plane_ip = control_plane_ips[pillar['bootstrap_id']][0] %}
{%- else %}
{%- set control_plane_ip = 'localhost' %}
{%- endif %}

{% set node = pillar['node_name'] %}

Bootstrap client certs:
  salt.state:
    - tgt: {{ node }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.kubeadm.init.certs.apiserver
      - metalk8s.kubeadm.init.certs.apiserver-etcd-client
      - metalk8s.kubeadm.init.certs.apiserver-kubelet-client
      - metalk8s.kubeadm.init.certs.front-proxy-client
    - pillar:
        repo:
          host: {{ control_plane_ip }}
        registry_ip: {{ control_plane_ip }}

Bootstrap control plane:
  salt.state:
    - tgt: {{ node }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.bootstrap.kubeconfig
      - metalk8s.bootstrap.control-plane
    - require:
      - salt: Bootstrap client certs
    - pillar:
        repo:
          host: {{ control_plane_ip }}
        registry_ip: {{ control_plane_ip }}

Bootstrap node:
  salt.state:
    - tgt: {{ pillar['bootstrap_id'] }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.bootstrap.mark_control_plane
    - require:
      - salt: Bootstrap control plane
    - pillar:
        mark_control_plane_hostname: {{ node }}
        repo:
          host: {{ control_plane_ip }}
        registry_ip: {{ control_plane_ip }}

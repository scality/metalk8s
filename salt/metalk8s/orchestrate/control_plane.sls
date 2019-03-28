{%- set control_plane_ips = salt.saltutil.runner('mine.get', tgt='*', fun='control_plane_ips') %}
{%- if pillar['bootstrap_id'] in control_plane_ips.keys() and control_plane_ips[pillar['bootstrap_id']] %}
{%- set control_plane_ip = control_plane_ips[pillar['bootstrap_id']][0] %}
{%- else %}
{%- set control_plane_ip = 'localhost' %}
{%- endif %}

{% set node = pillar.get('node_name', 'node1') %}

Update mine:
  salt.state:
    - tgt: {{ node }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.mine.ips

Bootstrap client certs:
  salt.state:
    - tgt: {{ node }}
    - saltenv: {{ saltenv }}
    - sls:
          - metalk8s.kubeadm.init.certs.apiserver
          - metalk8s.kubeadm.init.certs.apiserver-kubelet-client
          - metalk8s.kubeadm.init.certs.sa
          - metalk8s.kubeadm.init.certs.front-proxy-client
    - require:
      - salt: Update mine

Bootstrap control plane:
  salt.state:
    - tgt: {{ node }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.bootstrap.kubeconfig
      - metalk8s.bootstrap.control-plane
    - require:
      - salt: Bootstrap client certs

Bootstrap node:
  salt.state:
    - tgt: {{ node }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.bootstrap.mark_control_plane
      - metalk8s.bootstrap.addons
      - metalk8s.bootstrap.calico
    - require:
      - salt: Bootstrap control plane

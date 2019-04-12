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

{% set node = pillar['node_name'] %}

Run bootstrap prechecks:
  salt.state:
    - tgt: {{ node }}
    - saltenv: {{ saltenv }}
    - sls: metalk8s.bootstrap.precheck

Set grains:
  salt.state:
    - tgt: {{ node }}
    - saltenv: {{ saltenv }}
    - sls: metalk8s.node.grains

Run bootstrap kubelet:
  salt.state:
    - tgt: {{ node }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.bootstrap.kubelet_install
    - pillar:
        repo:
          host: {{ control_plane_ip }}
        registry_ip: {{ control_plane_ip }}

Run bootstrap preflight:
  salt.state:
    - tgt: {{ node }}
    - saltenv: {{ saltenv }}
    - sls: metalk8s.bootstrap.preflight
    - pillar:
        repo:
          host: {{ control_plane_ip }}
        registry_ip: {{ control_plane_ip }}

Run bootstrap kubelet start:
  salt.state:
    - tgt: {{ node }}
    - saltenv: {{ saltenv }}
    - sls:
      - metalk8s.bootstrap.kubelet_start
      - metalk8s.kubeadm.init.kubeconfig.kubelet
    - pillar:
        apiserver_addr: {{ control_plane_ip }}
        repo:
          host: {{ control_plane_ip }}
        registry_ip: {{ control_plane_ip }}

Install calico:
  salt.state:
    - saltenv: {{ saltenv }}
    - tgt: {{ node }}
    - sls:
      -  metalk8s.calico.installed
      -  metalk8s.calico.configured
    - pillar:
        repo:
          host: {{ control_plane_ip }}
        registry_ip: {{ control_plane_ip }}

# TODO: Investigate why we have to reload systemd and restart kubelet
Run sysctemctl reload:
  salt.function:
    - tgt: {{ node }}
    - name: service.systemctl_reload

Restart kubelet:
  salt.function:
    - tgt: {{ node }}
    - name: service.restart
    - arg:
        - kubelet

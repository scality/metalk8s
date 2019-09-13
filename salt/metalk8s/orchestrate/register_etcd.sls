{# Should be run by the orchestrator runner #}

{%- set nodename = pillar.orchestrate.node_name -%}

{%- set node_ip = salt.saltutil.runner(
    'mine.get',
     tgt=nodename,
     fun='control_plane_ip')[nodename]
 %}

{%- set peer_url = 'https://' ~ node_ip ~ ':2380' %}

Register host as part of etcd cluster:
  metalk8s_etcd.member_present:
    - name: {{ nodename }}
    - peer_urls:
       - {{ peer_url }}

Check etcd cluster health:
  metalk8s.module_run:
    - metalk8s_etcd.check_etcd_health:
      - minion_id: {{ nodename }}
    - attemps: 5
    - require:
      - metalk8s_etcd: Register host as part of etcd cluster

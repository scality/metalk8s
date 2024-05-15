{# Should be run by the orchestrator runner #}
# This state cannot run on a minion since it depends on etcd3 python lib
# which is only available by default on the salt-master.

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
  module.run:
    - metalk8s_etcd.check_etcd_health:
      - minion_id: {{ nodename }}
    - retry:
        attempts: 5
        until: "cluster is healthy"
        interval: 10
    - require:
      - metalk8s_etcd: Register host as part of etcd cluster

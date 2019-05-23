{%- set dest_version = pillar.orchestrate.dest_version %}
{%- set etcd_nodes = salt.metalk8s.minions_by_role('etcd') %}

Check etcd cluster health:
  module.run:
    - metalk8s_etcd.check_etcd_health:
      - minion_id: {{ salt.network.get_hostname() }}

{%- for node in etcd_nodes | sort %}

Sync {{ node }} minion:
  salt.function:
    - name: saltutil.sync_all
    - tgt: {{ node }}
    - saltenv: metalk8s-{{ dest_version }}

Upgrade etcd {{ node }} to {{ dest_version }}:
  salt.state:
    - tgt: {{ node }}
    - sls:
      - metalk8s.kubernetes.etcd.healthy
    - saltenv: metalk8s-{{ dest_version }}
    - require:
      - salt: Sync {{ node }} minion
      - module: Check etcd cluster health
  {%- if previous_node is defined %}
      - module: Check etcd cluster health for {{ previous_node }}
  {%- endif %}

Check etcd cluster health for {{ node }}:
  module.run:
    - metalk8s_etcd.check_etcd_health:
      - minion_id: {{ node }}
    # FIXME: Can't retry because of https://github.com/saltstack/salt/issues/44639
    # Should be ok for the moment as we check health in etcd.health state.
    #- retry:
    #    attempts: 5
    - require:
      - salt: Upgrade etcd {{ node }} to {{ dest_version }}

  {#- Ugly but needed since we have jinja2.7 (`loop.previtem` added in 2.10) #}
  {%- set previous_node = node %}

{%- endfor %}

# This orchestrate is used to do a rolling upgrade or downgrade of the etcd
# cluster, that's why this orchestrate need to be backward compatible with
# latest MetalK8s minor version

{%- set dest_version = pillar.metalk8s.cluster_version %}
{%- set etcd_nodes = salt.metalk8s.minions_by_role('etcd') %}

Check etcd cluster health:
  module.run:
    - metalk8s_etcd.check_etcd_health: []

{%- for node in etcd_nodes | sort %}

Sync {{ node }} minion:
  salt.function:
    - name: saltutil.sync_all
    - tgt: {{ node }}
    - kwarg:
        saltenv: metalk8s-{{ dest_version }}

Check pillar on {{ node }}:
  salt.function:
    - name: metalk8s.check_pillar_keys
    - tgt: {{ node }}
    - kwarg:
        keys:
          - metalk8s.endpoints.repositories.ip
          - metalk8s.endpoints.repositories.ports.http
        # We cannot raise when using `salt.function` as we need to return
        # `False` to have a failed state
        # https://github.com/saltstack/salt/issues/55503
        raise_error: False
    - retry:
        attempts: 5
    - require:
      - salt: Sync {{ node }} minion

Deploy etcd {{ node }} to {{ dest_version }}:
  salt.state:
    - tgt: {{ node }}
    - sls:
      - metalk8s.kubernetes.etcd
    - saltenv: metalk8s-{{ dest_version }}
    - require:
      - salt: Check pillar on {{ node }}
      - module: Check etcd cluster health
  {%- if loop.previtem is defined %}
      - metalk8s: Check etcd cluster health for {{ loop.previtem }}
  {%- endif %}

Check etcd cluster health for {{ node }}:
  metalk8s.module_run:
    - metalk8s_etcd.check_etcd_health: []
    # Wait at most (31 - 1) * 10s = 300s = 5mn
    - attempts: 31
    - sleep_time: 10
    - require:
      - salt: Deploy etcd {{ node }} to {{ dest_version }}

{%- endfor %}

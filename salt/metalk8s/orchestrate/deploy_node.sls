{%- set node_name = pillar.orchestrate.node_name %}
{%- set version = pillar.metalk8s.nodes[node_name].version %}

{%- set skip_roles = pillar.metalk8s.nodes[node_name].get('skip_roles', []) %}

{%- set roles = pillar.get('metalk8s', {}).get('nodes', {}).get(node_name, {}).get('roles', []) %}

{%- if node_name not in salt.saltutil.runner('manage.up') %}
Deploy salt-minion on a new node:
  salt.state:
    - ssh: true
    - roster: kubernetes
    - tgt: {{ node_name }}
    - saltenv: metalk8s-{{ version }}
    - sls:
      - metalk8s.roles.minion

Accept key:
  module.run:
    - saltutil.wheel:
      - key.accept
      - {{ node_name }}
    - require:
      - salt: Deploy salt-minion on a new node

Wait minion available ssh:
  salt.runner:
    - name: metalk8s_saltutil.wait_minions
    - tgt: {{ node_name }}
    - require:
      - module: Accept key
    - require_in:
      - salt: Set grains
      - salt: Refresh the mine
      - salt: Cordon the node
{%- endif %}

Sync module on the node:
  salt.function:
    - name: saltutil.sync_all
    - tgt: {{ node_name }}
    - kwarg:
        saltenv: metalk8s-{{ version }}

Set grains:
  salt.state:
    - tgt: {{ node_name }}
    - saltenv: metalk8s-{{ version }}
    - sls:
      - metalk8s.node.grains
    - require:
      - salt: Sync module on the node

Refresh the mine:
  salt.function:
    - name: mine.update
    - tgt: '*'

Cordon the node:
  metalk8s_cordon.node_cordoned:
    - name: {{ node_name }}

{%- if not pillar.orchestrate.get('skip_draining', False) %}

Drain the node:
  metalk8s_drain.node_drained:
    - name: {{ node_name }}
    - ignore_daemonset: True
    - delete_local_data: True
    - force: True
    - require:
      - metalk8s_cordon: Cordon the node
    - require_in:
      - salt: Run the highstate

{%- endif %}

Check pillar before salt-minion configuration:
  salt.function:
    - name: metalk8s.check_pillar_keys
    - tgt: {{ node_name }}
    - kwarg:
        keys:
          - metalk8s.endpoints.salt-master.ip
          - metalk8s.endpoints.repositories.ip
          - metalk8s.endpoints.repositories.ports.http
        # We cannot raise when using `salt.function` as we need to return
        # `False` to have a failed state
        # https://github.com/saltstack/salt/issues/55503
        raise_error: False
    - retry:
        attempts: 5
    - require:
      - salt: Sync module on the node

Reconfigure salt-minion:
  salt.state:
    - tgt: {{ node_name }}
    - saltenv: metalk8s-{{ version }}
    - sls:
      - metalk8s.salt.minion.configured
    # NOTE: This state may upgrade/downgrade salt-minion package and also
    # restart salt-minion service, so it may take time to answer salt-master
    # job query, so increase timeout for this specific state
    - timeout: 200
    - require:
      - salt: Set grains
      - salt: Refresh the mine
      - salt: Check pillar before salt-minion configuration

Wait minion available:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:test.sleep(10)
    - comment: Wait a bit for 'salt-minion' to restart before checking status
    - onchanges:
      - salt: Reconfigure salt-minion
  salt.runner:
    - name: metalk8s_saltutil.wait_minions
    - tgt: {{ node_name }}
    - require:
      - test: Wait minion available
    - require_in:
      - http: Wait for API server to be available before highstate

{%- if 'etcd' in roles and 'etcd' not in skip_roles %}

Check pillar before etcd deployment:
  salt.function:
    - name: metalk8s.check_pillar_keys
    - tgt: {{ node_name }}
    - kwarg:
        keys:
          - metalk8s.endpoints.salt-master.ip
          - metalk8s.endpoints.repositories.ip
          - metalk8s.endpoints.repositories.ports.http
        # We cannot raise when using `salt.function` as we need to return
        # `False` to have a failed state
        # https://github.com/saltstack/salt/issues/55503
        raise_error: False
    - retry:
        attempts: 5
    - require:
      - salt: Sync module on the node

Install etcd node:
  salt.state:
    - tgt: {{ node_name }}
    - saltenv: metalk8s-{{ version }}
    - sls:
      - metalk8s.roles.etcd
    - pillar:
        metalk8s:
          # Skip etcd healthcheck as we register etcd member just after
          skip_etcd_healthcheck: True
          # Skip apiserver-proxy healthcheck as local apiserver may not be
          # deployed yet (as we call `highstate` just after)
          skip_apiserver_proxy_healthcheck: True
    - require:
      - salt: Check pillar before etcd deployment

Register the node into etcd cluster:
  salt.runner:
    - name: state.orchestrate
    - pillar: {{ pillar | json  }}
    - mods:
      - metalk8s.orchestrate.register_etcd
    - require:
      - salt: Install etcd node
    - require_in:
      - http: Wait for API server to be available before highstate

{%- endif %}

Wait for API server to be available before highstate:
  http.wait_for_successful_query:
  - name: https://127.0.0.1:7443/healthz
  - match: 'ok'
  - status: 200
  - verify_ssl: false

Check pillar before highstate:
  salt.function:
    - name: metalk8s.check_pillar_keys
    - tgt: {{ node_name }}
    - kwarg:
        keys:
          - metalk8s.endpoints.salt-master.ip
          - metalk8s.endpoints.repositories.ip
          - metalk8s.endpoints.repositories.ports.http
        # We cannot raise when using `salt.function` as we need to return
        # `False` to have a failed state
        # https://github.com/saltstack/salt/issues/55503
        raise_error: False
    - retry:
        attempts: 5
    - require:
      - salt: Sync module on the node
      - http: Wait for API server to be available before highstate

Run the highstate:
  salt.state:
    - tgt: {{ node_name }}
    - highstate: True
    - saltenv: metalk8s-{{ version }}
    {#- Add ability to skip node roles to not apply all the highstate
        e.g.: Skipping etcd when downgrading #}
    {%- if skip_roles %}
    - pillar:
        metalk8s:
          nodes:
            {{ node_name }}:
              skip_roles: {{ skip_roles | unique | tojson }}
    {%- endif %}
    - require:
      - salt: Set grains
      - salt: Refresh the mine
      - metalk8s_cordon: Cordon the node
      - salt: Check pillar before highstate

Wait for API server to be available:
  http.wait_for_successful_query:
  - name: https://127.0.0.1:7443/healthz
  - match: 'ok'
  - status: 200
  - verify_ssl: false

Uncordon the node:
  metalk8s_cordon.node_uncordoned:
    - name: {{ node_name }}
    - require:
      - salt: Run the highstate
      - http: Wait for API server to be available

{%- set master_minions = salt['metalk8s.minions_by_role']('master') %}

# Work-around for https://github.com/scality/metalk8s/pull/1028
Kill kube-controller-manager on all master nodes:
  salt.function:
    - name: ps.pkill
    - tgt: "{{ master_minions | join(',') }}"
    - tgt_type: list
    - fail_minions: "{{ master_minions | join(',') }}"
    - kwarg:
        pattern: kube-controller-manager
    - require:
      - salt: Run the highstate


{%- set node_name = pillar.orchestrate.node_name %}
{%- set version = pillar.metalk8s.nodes[node_name].version %}

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

Wait minion available:
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

Set grains:
  salt.state:
    - tgt: {{ node_name }}
    - saltenv: metalk8s-{{ version }}
    - sls:
      - metalk8s.node.grains

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

Sync module on the node:
  salt.function:
    - name: saltutil.sync_all
    - tgt: {{ node_name }}
    - kwarg:
        saltenv: {{ saltenv }}

Refresh and check pillar before highstate:
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

{%- if node_name in salt.saltutil.runner('manage.up') %}

Reconfigure salt-minion:
  salt.state:
    - tgt: {{ node_name }}
    - saltenv: metalk8s-{{ version }}
    - sls:
      - metalk8s.salt.minion.configured
    - require:
      - salt: Set grains
      - salt: Refresh the mine
      - salt: Refresh and check pillar before highstate

Wait minion available:
  salt.runner:
    - name: metalk8s_saltutil.wait_minions
    - tgt: {{ node_name }}
    - require:
      - salt: Reconfigure salt-minion
    - require_in:
      - salt: Run the highstate

{%- endif %}

Run the highstate:
  salt.state:
    - tgt: {{ node_name }}
    - highstate: True
    - saltenv: metalk8s-{{ version }}
    - require:
      - salt: Set grains
      - salt: Refresh the mine
      - metalk8s_cordon: Cordon the node
      - salt: Refresh and check pillar before highstate

Wait for API server to be available:
  http.wait_for_successful_query:
  - name: https://{{ pillar.metalk8s.api_server.host }}:6443/healthz
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

{%- if 'etcd' in pillar.get('metalk8s', {}).get('nodes', {}).get(node_name, {}).get('roles', []) %}

Register the node into etcd cluster:
  salt.runner:
    - name: state.orchestrate
    - pillar: {{ pillar | json  }}
    - mods:
      - metalk8s.orchestrate.register_etcd
    - require:
      - salt: Run the highstate

{%- endif %}

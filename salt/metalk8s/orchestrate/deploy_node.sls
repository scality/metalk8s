{%- from "metalk8s/map.jinja" import defaults with context %}
{%- from "metalk8s/map.jinja" import networks with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{%- set node_name = pillar.orchestrate.node_name %}
{%- set run_drain = not pillar.orchestrate.get('skip_draining', False) %}
{%- set version = pillar.metalk8s.nodes[node_name].version %}

{%- set skip_roles = pillar.metalk8s.nodes[node_name].get('skip_roles', []) %}

{%- set roles = pillar.get('metalk8s', {}).get('nodes', {}).get(node_name, {}).get('roles', []) %}

{%- if node_name not in salt.saltutil.runner('manage.up') %}
# Salt-ssh need python3 to be installed on the destination host, so install it
# manually using raw ssh
Install python36:
  metalk8s.saltutil_cmd:
    - name: '[ "$EUID" -eq 0 ] && yum install -y python3 || sudo yum install -y python3'
    - tgt: {{ node_name }}
    - ssh: true
    - raw_shell: true
    - roster: kubernetes

Set grains ssh:
  salt.state:
    - ssh: true
    - roster: kubernetes
    - tgt: {{ node_name }}
    - saltenv: metalk8s-{{ version }}
    - sls:
      - metalk8s.node.grains
    - require:
      - metalk8s: Install python36

Refresh grains:
  metalk8s.saltutil_cmd:
    - name: saltutil.sync_grains
    - tgt: {{ node_name }}
    - ssh: true
    - roster: kubernetes
    - require:
      - salt: Set grains ssh

Check node:
  metalk8s.saltutil_cmd:
    - name: metalk8s_checks.node
    - tgt: {{ node_name }}
    - ssh: true
    - roster: kubernetes
    - kwarg:
        # NOTE: We need to use the `conflicting_packages` and `conflicting_services`
        # `listening_process_per_role` from the salt master since in salt-ssh
        # when running an execution module we cannot embbed additional files
        # (especially `map.jinja` in this case)
        # Sees: https://github.com/saltstack/salt/issues/59314
        conflicting_packages: >-
          {{ repo.conflicting_packages | tojson }}
        conflicting_services: >-
          {{ defaults.conflicting_services | tojson }}
        listening_process_per_role: >-
          {{ networks.listening_process_per_role | tojson }}
        # NOTE: We also need to give all the pillar value needed since execution
        # module in Salt-ssh cannot read pillar data
        # Sees: https://github.com/saltstack/salt/issues/28503
        service_cidr: {{ pillar.networks.service }}
        roles: {{ pillar.metalk8s.nodes[node_name].roles }}
    - failhard: true
    - require:
      - metalk8s: Refresh grains

Deploy salt-minion on a new node:
  salt.state:
    - ssh: true
    - roster: kubernetes
    - tgt: {{ node_name }}
    - saltenv: metalk8s-{{ version }}
    - sls:
      - metalk8s.roles.minion
    - require:
      - metalk8s: Check node

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

{%- if run_drain %}

Drain the node:
  metalk8s_drain.node_drained:
    - name: {{ node_name }}
    - ignore_daemonset: True
    - ignore_pending: True
    - delete_local_data: True
    - force: True
    {%- if pillar.orchestrate.get("drain_timeout") %}
    - timeout: {{ pillar.orchestrate.drain_timeout }}
    {%- endif %}
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
          - metalk8s.endpoints.salt-master
          - metalk8s.endpoints.repositories
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
          - metalk8s.endpoints.salt-master
          - metalk8s.endpoints.repositories
        # We cannot raise when using `salt.function` as we need to return
        # `False` to have a failed state
        # https://github.com/saltstack/salt/issues/55503
        raise_error: False
    - retry:
        attempts: 5
    - require:
      - salt: Sync module on the node
      - salt: Wait minion available

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
    - pillar: {{ pillar | json }}
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
          - metalk8s.endpoints.salt-master
          - metalk8s.endpoints.repositories
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

{%- if 'infra' in roles and 'infra' not in skip_roles %}

# Trigger a restart of CoreDNS pods so that "soft anti-affinity" can be applied
Restart CoreDNS pods:
  module.run:
    - metalk8s_kubernetes.rollout_restart:
      - name: coredns
      - namespace: kube-system
      - kind: Deployment
      - apiVersion: apps/v1
    - require:
      - metalk8s_cordon: Uncordon the node

{%- endif %}

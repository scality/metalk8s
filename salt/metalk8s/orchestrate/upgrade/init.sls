# NOTE: This orchestrate does not follow the Kubernetes upgrade process, and
#       instead upgrades nodes fully (highstate), one by one.
#       This orchestrate should only be called after several other upgrade
#       steps, refer to the upgrade script.

{%- set dest_version = pillar.metalk8s.cluster_version %}

Execute the upgrade prechecks:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.orchestrate.upgrade.precheck
    - saltenv: {{ saltenv }}

{%- set cp_nodes = salt.metalk8s.minions_by_role('master') | sort %}
{%- set other_nodes = pillar.metalk8s.nodes.keys() | difference(cp_nodes) | sort %}

{%- for node in cp_nodes + other_nodes %}

  {%- set node_version = pillar.metalk8s.nodes[node].version|string %}
  {%- set version_cmp = salt.pkg.version_cmp(dest_version, node_version) %}
  {#- If dest_version = 2.1.0-dev and node_version = 2.1.0, version_cmp = 0
      but we should not upgrade this node #}
  {%- if version_cmp == -1
      or (version_cmp == 0 and dest_version != node_version and '-' not in node_version) %}

Skip node {{ node }}, already in {{ node_version }} newer than {{ dest_version }}:
  test.succeed_without_changes

  {%- else %}

Check pillar on {{ node }} before installing apiserver-proxy:
  salt.function:
    - name: metalk8s.check_pillar_keys
    - tgt: {{ node }}
    - kwarg:
        keys:
          - metalk8s.endpoints.repositories
        # We cannot raise when using `salt.function` as we need to return
        # `False` to have a failed state
        # https://github.com/saltstack/salt/issues/55503
        raise_error: False
    - retry:
        attempts: 5
    - require:
      - salt: Execute the upgrade prechecks
    {%- if loop.previtem is defined %}
      - salt: Deploy node {{ loop.previtem }}
    {%- endif %}

Install apiserver-proxy on {{ node }}:
  salt.state:
    - tgt: {{ node }}
    - sls:
      - metalk8s.kubernetes.apiserver-proxy
    - saltenv: {{ saltenv }}
    - require:
      - salt: Check pillar on {{ node }} before installing apiserver-proxy

Wait for API server to be available on {{ node }}:
  http.wait_for_successful_query:
  - name: https://127.0.0.1:7443/healthz
  - match: 'ok'
  - status: 200
  - verify_ssl: false
  - require:
    - salt: Install apiserver-proxy on {{ node }}

Set node {{ node }} version to {{ dest_version }}:
  metalk8s_kubernetes.object_updated:
    - name: {{ node }}
    - kind: Node
    - apiVersion: v1
    - patch:
        metadata:
          labels:
            metalk8s.scality.com/version: "{{ dest_version }}"
    - require:
      - http: Wait for API server to be available on {{ node }}

Deploy node {{ node }}:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.orchestrate.deploy_node
    - saltenv: {{ saltenv }}
    - pillar:
        orchestrate:
          node_name: {{ node }}
          {%- if pillar.metalk8s.nodes|length == 1 %}
          {#- Do not drain if we are in single node cluster #}
          skip_draining: True
          {%- endif %}
    - require:
      - metalk8s_kubernetes: Set node {{ node }} version to {{ dest_version }}
    - require_in:
      - salt: Deploy Kubernetes service config objects

  {%- endif %}

{%- endfor %}

Sync module on salt-master:
  salt.runner:
    - name: saltutil.sync_all
    - saltenv: metalk8s-{{ dest_version }}

Deploy Kubernetes service config objects:
  salt.runner:
  - name: state.orchestrate
  - mods:
    - metalk8s.service-configuration.deployed
  - saltenv: metalk8s-{{ dest_version }}
  - require:
    - salt: Sync module on salt-master

Deploy Kubernetes objects:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.deployed
    - saltenv: metalk8s-{{ dest_version }}
    - require:
      - salt: Sync module on salt-master
      - salt: Deploy Kubernetes service config objects

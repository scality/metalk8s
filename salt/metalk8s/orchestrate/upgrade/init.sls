# NOTE: This orchestrate does not follow the Kubernetes upgrade process, and
#       instead upgrades nodes fully (highstate), one by one.
#       This orchestrate should only be called after several other upgrade
#       steps, refer to the upgrade script.

{%- from "metalk8s/orchestrate/upgrade/nodes.jinja" import dest_version, skipped_nodes with context %}

Execute the upgrade prechecks:
  salt.runner:
    - name: metalk8s_checks.upgrade
    - dest_version: {{ dest_version }}
    - saltenv: {{ saltenv }}

{%- set cp_nodes = salt.metalk8s.minions_by_role('master') | sort %}
{%- set other_nodes = pillar.metalk8s.nodes.keys() | difference(cp_nodes) | sort %}

{#- Nodes are deployed one by one, each waiting on the previous one. A skipped node
    declares no state, so the chain must remember the last node actually deployed,
    otherwise the next one waits on a state that does not exist and Salt fails it
    with "The following requisites were not found". #}
{%- set deployed = namespace(previous=None) %}

{%- for node in cp_nodes + other_nodes %}

  {%- if node in skipped_nodes %}
Skip node {{ node }}, {{ skipped_nodes[node] }}:
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
    {%- if deployed.previous %}
      - salt: Deploy node {{ deployed.previous }}
    {%- endif %}

Install apiserver-proxy on {{ node }}:
  salt.state:
    - tgt: {{ node }}
    - sls:
      - metalk8s.kubernetes.apiserver-proxy
    - saltenv: {{ saltenv }}
    {#- Increase the timeout to 300s instead of the default 20s, to let this
        state run to completion, because it writes the apiserver-proxy static
        pod manifest on the very node the salt-master polls with
        `saltutil.find_job`, and the kubelet replaces that pod while the state
        is still being polled. This prevents Salt reporting `Run failed on
        minions: <node>` and aborting the upgrade before any node is
        deployed #}
    - timeout: 300
    - require:
      - salt: Check pillar on {{ node }} before installing apiserver-proxy

Wait for API server to be available on {{ node }}:
  http.wait_for_successful_query:
  - name: https://127.0.0.1:7443/healthz
  - match: 'ok'
  - status: 200
  - verify_ssl: false
  - request_interval: 1
  - require:
    - salt: Install apiserver-proxy on {{ node }}

{#- The version label selects the saltenv used to deploy the node, so it has to
    be set before the deployment. The marker goes with it, so a run interrupted
    between here and the deployment still leaves the node flagged. `deploy_node`
    maintains both annotations from there, and clears the marker once it is
    through. #}
Set node {{ node }} version to {{ dest_version }}:
  metalk8s_kubernetes.object_updated:
    - name: {{ node }}
    - kind: Node
    - apiVersion: v1
    - patch:
        metadata:
          labels:
            metalk8s.scality.com/version: "{{ dest_version }}"
          annotations:
            metalk8s.scality.com/version-in-progress: "{{ dest_version }}"
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
          drain_timeout: {{ salt.pillar.get("orchestrate:drain_timeout", default=0) }}
          {%- if pillar.metalk8s.nodes|length == 1 %}
          {#- Do not drain if we are in single node cluster #}
          skip_draining: True
          {%- endif %}
    - require:
      - metalk8s_kubernetes: Set node {{ node }} version to {{ dest_version }}
    - require_in:
      - salt: Deploy core component objects
      - salt: Deploy Kubernetes service config objects

    {%- set deployed.previous = node %}
  {%- endif %}

{%- endfor %}

Sync module on salt-master:
  salt.runner:
    - name: saltutil.sync_all
    - saltenv: metalk8s-{{ dest_version }}

Deploy core component objects:
  salt.runner:
  - name: state.orchestrate
  - mods:
    - metalk8s.deployed.core
  - saltenv: metalk8s-{{ dest_version }}
  - require:
    - salt: Sync module on salt-master

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
      - salt: Deploy core component objects

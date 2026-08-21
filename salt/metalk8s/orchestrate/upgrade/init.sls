# NOTE: This orchestrate does not follow the Kubernetes upgrade process, and
#       instead upgrades nodes fully (highstate), one by one.
#       This orchestrate should only be called after several other upgrade
#       steps, refer to the upgrade script.

{%- set dest_version = pillar.metalk8s.cluster_version %}

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

  {#- The version label is set before a node is deployed, since it selects the
      saltenv, so it says what the node was asked to run, not what it runs. The
      `version-applied` annotation records the last version a node completed, and
      that is what decides whether it still needs this one. #}
  {%- set node_label = pillar.metalk8s.nodes[node].version|string %}
  {%- set node_applied = pillar.metalk8s.nodes[node].get('version_applied') %}
  {%- set node_in_progress = pillar.metalk8s.nodes[node].get('version_in_progress') %}
  {#- Of a node that did finish its last deployment, keep the lower of the annotation
      and the label. Every version of this orchestrate maintains the label, only the
      ones that know about the annotation maintain it, so the two can disagree. An
      upgrade must not skip a node that might still run the older of the two. #}
  {%- if node_applied
      and salt.pkg.version_cmp(node_applied|string, node_label) in (-1, 0) %}
    {%- set node_version = node_applied|string %}
  {%- else %}
    {%- set node_version = node_label %}
  {%- endif %}
  {%- set version_cmp = salt.pkg.version_cmp(dest_version, node_version) %}
  {#- A node that completed the destination is left alone, so resuming an
      interrupted upgrade only works the nodes that need it. This leans on the
      annotation: `node_version` only equals `node_applied` when that annotation
      is the one we trust, and the label alone never proved that a node ran the
      version it advertises (MK8S-370). #}
  {%- set completed_dest = node_applied is not none
                           and node_version == node_applied|string
                           and node_version == dest_version %}
  {#- If dest_version = 2.1.0-dev and node_version = 2.1.0, version_cmp = 0
      but we should not upgrade this node #}
  {#- A node still carrying the in-progress marker is another matter: its
      deployment never finished, so neither its label nor its recorded version
      says what it runs, and it gets deployed rather than trusted. #}
  {%- if node_in_progress is none
      and (version_cmp == -1
           or completed_dest
           or (version_cmp == 0 and dest_version != node_version and '-' not in node_version)) %}

  {%- if completed_dest %}
    {%- set skip_reason = "already completed " ~ dest_version %}
  {%- else %}
    {%- set skip_reason = "already in " ~ node_version ~ " newer than " ~ dest_version %}
  {%- endif %}
Skip node {{ node }}, {{ skip_reason }}:
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
    be set before the deployment. The annotation records that the node does not
    run this version yet, and is removed once the deployment succeeded. #}
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

Mark node {{ node }} as running {{ dest_version }}:
  metalk8s_kubernetes.object_updated:
    - name: {{ node }}
    - kind: Node
    - apiVersion: v1
    - patch:
        metadata:
          annotations:
            metalk8s.scality.com/version-in-progress: null
            metalk8s.scality.com/version-applied: "{{ dest_version }}"
    {#- The node deployment just restarted the API server on this node, so give this
        write a few tries before it fails the upgrade #}
    - retry:
        attempts: 5
        interval: 30
    - require:
      - salt: Deploy node {{ node }}

{#- Clearing the marker is the last step, and it is the only one that can fail on
    a node that is otherwise upgraded. Say so, rather than leaving the operator with
    a bare API error on the very last state. The `require` matters: without it this
    state also fires when the node deployment itself failed, and would then claim a
    broken node is fine. #}
Explain the stale marker on {{ node }}:
  test.configurable_test_state:
    - name: {{ node }}
    - changes: False
    - result: True
    - comment: >-
        Node {{ node }} was upgraded to {{ dest_version }}, only the
        metalk8s.scality.com/version-in-progress annotation could not be cleared.
        The node itself is fine. Run upgrade.sh again to redeploy it and record
        the version, or record it by hand with "kubectl annotate node
        {{ node }} metalk8s.scality.com/version-in-progress-
        metalk8s.scality.com/version-applied={{ dest_version }} --overwrite". Until
        one of those, an upgrade to another version is refused.
    - onfail:
      - metalk8s_kubernetes: Mark node {{ node }} as running {{ dest_version }}
    - require:
      - salt: Deploy node {{ node }}

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

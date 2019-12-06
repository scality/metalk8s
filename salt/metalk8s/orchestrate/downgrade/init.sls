{%- set dest_version = pillar.metalk8s.cluster_version %}

Execute the downgrade prechecks:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.orchestrate.downgrade.precheck
    - saltenv: {{ saltenv }}
    - pillar:
        orchestrate:
          dest_version: {{ dest_version }}

{%- set cp_nodes = salt.metalk8s.minions_by_role('master') | sort %}
{%- set other_nodes = pillar.metalk8s.nodes.keys() | difference(cp_nodes) | sort %}

{%- for node in other_nodes + cp_nodes %}

  {%- set node_version = pillar.metalk8s.nodes[node].version|string %}
  {%- set version_cmp = salt.pkg.version_cmp(dest_version, node_version) %}
  {#- If dest_version = 2.1.0 and node_version = 2.1.0-dev, version_cmp = 0
      but we should not downgrade this node #}
  {%- if version_cmp == 1
      or (version_cmp == 0 and dest_version != node_version and '-' not in dest_version) %}

Skip node {{ node }}, already in {{ node_version }} older than {{ dest_version }}:
  test.succeed_without_changes

  {%- elif 'bootstrap' in pillar.metalk8s.nodes[node].roles %}

Skip node {{ node }}, bootstrap node downgrade should be done later:
  test.succeed_without_changes

  {%- else %}

Wait for API server to be available on {{ node }}:
  http.wait_for_successful_query:
  - name: https://{{ pillar.metalk8s.api_server.host }}:6443/healthz
  - match: 'ok'
  - status: 200
  - verify_ssl: false
  - require:
    - salt: Execute the downgrade prechecks
  {%- if previous_node is defined %}
    - salt: Deploy node {{ previous_node }}
  {%- endif %}

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
      - salt: Downgrade etcd cluster

    {#- Ugly but needed since we have jinja2.7 (`loop.previtem` added in 2.10) #}
    {%- set previous_node = node %}

  {%- endif %}

{%- endfor %}

Downgrade etcd cluster:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.orchestrate.etcd
    - saltenv: {{ saltenv }}
    - pillar:
        orchestrate:
          dest_version: {{ dest_version }}
    - require:
      - salt: Execute the downgrade prechecks

{#- In MetalK8s-2.4.2 we added selector in nginx ingress controller DaemonSet
    and nginx ingress default backend Deployment but `selector` are immutable
    field so, in this case, we cannot replace the object we need to first
    remove the current one and then deploy the desired one. #}
{#- Only do it `if dest_version < 2.4.2` #}
{%- if salt.pkg.version_cmp(dest_version, '2.4.2') == 1 %}

Delete old nginx ingress daemon set:
  metalk8s_kubernetes.object_absent:
    - name: nginx-ingress-controller
    - namespace: metalk8s-ingress
    - kind: DaemonSet
    - apiVersion: extensions/v1beta1
    - wait:
        attempts: 10
        sleep: 10
    - require_in:
      - salt: Sync module on salt-master

Delete old nginx ingress deployment:
  metalk8s_kubernetes.object_absent:
    - name: nginx-ingress-default-backend
    - namespace: metalk8s-ingress
    - kind: Deployment
    - apiVersion: extensions/v1beta1
    - wait:
        attempts: 10
        sleep: 10
    - require_in:
      - salt: Sync module on salt-master

Delete old nginx ingress control plane controller daemon set:
  metalk8s_kubernetes.object_absent:
    - name: nginx-ingress-control-plane-controller
    - namespace: metalk8s-ingress
    - kind: DaemonSet
    - apiVersion: extensions/v1beta1
    - wait:
        attempts: 10
        sleep: 10
    - require_in:
      - salt: Sync module on salt-master

{%- endif %}

Sync module on salt-master:
  salt.runner:
    - name: saltutil.sync_all
    - saltenv: metalk8s-{{ dest_version }}

Deploy Kubernetes objects:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.deployed
    - saltenv: metalk8s-{{ dest_version }}
    - require:
      - salt: Sync module on salt-master
      - salt: Downgrade etcd cluster

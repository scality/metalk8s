{%- set dest_version = pillar.orchestrate.dest_version %}
{%- set kubeconfig = "/etc/kubernetes/admin.conf" %}
{%- set context = "kubernetes-admin@kubernetes" %}

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

Set node {{ node }} version to {{ dest_version }}:
  metalk8s_kubernetes.node_label_present:
    - name: metalk8s.scality.com/version
    - node: {{ node }}
    - value: "{{ dest_version }}"
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - require:
      - salt: Execute the downgrade prechecks
    {%- if previous_node is defined %}
      - salt: Deploy node {{ previous_node }}
    {%- endif %}

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

Deploy Kubernetes objects:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.deployed
    - saltenv: metalk8s-{{ dest_version }}
    - require:
      - salt: Downgrade etcd cluster

Precheck for MetalK8s UI:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.addons.ui.precheck
    - saltenv: metalk8s-{{ dest_version }}
    - retry:
        attempts: 5
    - require:
      - salt: Deploy Kubernetes objects

Deploy MetalK8s UI:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.addons.ui.deployed
    - saltenv: metalk8s-{{ dest_version }}
    - require:
      - salt: Precheck for MetalK8s UI

{%- set dest_version = pillar.orchestrate.dest_version %}

Execute the upgrade prechecks:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.orchestrate.upgrade.precheck
    - saltenv: {{ saltenv }}
    - pillar:
        orchestrate:
          dest_version: {{ dest_version }}

Upgrade etcd cluster:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.orchestrate.upgrade.etcd
    - saltenv: {{ saltenv }}
    - pillar:
        orchestrate:
          dest_version: {{ dest_version }}
    - require:
      - salt: Execute the upgrade prechecks

{%- set cp_nodes = salt.metalk8s.minions_by_role('master') | sort %}
{%- set other_nodes = pillar.metalk8s.nodes.keys() | difference(cp_nodes) | sort %}

{%- for node in cp_nodes + other_nodes %}

  {%- set kubeconfig = "/etc/kubernetes/admin.conf" %}
  {%- set context = "kubernetes-admin@kubernetes" %}

Set node {{ node }} version to {{ dest_version }}:
  metalk8s_kubernetes.node_label_present:
    - name: metalk8s.scality.com/version
    - node: {{ node }}
    - value: "{{ dest_version }}"
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - require:
      - salt: Upgrade etcd cluster
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
    - require:
      - metalk8s_kubernetes: Set node {{ node }} version to {{ dest_version }}
    - require_in:
      - salt: Deploy Kubernetes objects

  {#- Ugly but needed since we have jinja2.7 (`loop.previtem` added in 2.10) #}
  {%- set previous_node = node %}

{%- endfor %}

Deploy Kubernetes objects:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.deployed
    - saltenv: {{ saltenv }}
    - require:
      - salt: Upgrade etcd cluster

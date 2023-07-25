{%- set dest_version = pillar.metalk8s.cluster_version %}
{#- NOTE: This orchestrate is called with a `salt-master` running the
    `dest_version` so this orchestrate need to be backward compatible. #}

Execute the downgrade prechecks:
  salt.runner:
    - name: metalk8s_checks.downgrade
    - dest_version: {{ dest_version }}
    - saltenv: {{ saltenv }}
    {%- if pillar.metalk8s.get('downgrade', {}).get('bypass_disable') %}
    - bypass_disable: True
    {%- endif %}

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

  {%- else %}

Wait for API server to be available on {{ node }}:
  http.wait_for_successful_query:
  - name: https://127.0.0.1:7443/healthz
  - match: 'ok'
  - status: 200
  - verify_ssl: false
  - require:
    - salt: Execute the downgrade prechecks
  {%- if loop.previtem is defined %}
    - salt: Deploy node {{ loop.previtem }}
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
    - saltenv: metalk8s-{{ dest_version }}
    - pillar:
        orchestrate:
          node_name: {{ node }}
          drain_timeout: {{ salt.pillar.get("orchestrate:drain_timeout", default=0) }}
          {%- if pillar.metalk8s.nodes|length == 1 %}
          {#- Do not drain if we are in single node cluster #}
          skip_draining: True
          {%- endif %}
        metalk8s:
          nodes:
            {{ node }}:
              # Skip `etcd` role as we take care of etcd cluster after
              skip_roles:
                - etcd
    - require:
      - metalk8s_kubernetes: Set node {{ node }} version to {{ dest_version }}
    - require_in:
      - salt: Downgrade etcd cluster

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

Sync module on salt-master:
  salt.runner:
    - name: saltutil.sync_all
    - saltenv: metalk8s-{{ dest_version }}
    - require:
      - salt: Execute the downgrade prechecks

Deploy Kubernetes service config objects:
  salt.runner:
  - name: state.orchestrate
  - mods:
    - metalk8s.service-configuration.deployed
  - saltenv: metalk8s-{{ dest_version }}
  - require:
    - salt: Sync module on salt-master
  - require_in:
    - salt: Deploy Kubernetes objects

{#- In MetalK8s 126.0 the deployment of the storage-operator changed a bit
  including some resource renaming, let's remove old objects #}
{#- This logic can be removed in `development/127.0` #}
{%- if salt.pkg.version_cmp(dest_version, '126.0.0') == -1 %}

Delete storage-operator ServiceAccount:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: ServiceAccount
    - name: storage-operator-controller-manager
    - namespace: kube-system
    - require:
      - salt: Deploy Kubernetes service config objects
    - require_in:
      - salt: Deploy Kubernetes objects

Delete storage-operator Role:
  metalk8s_kubernetes.object_absent:
    - apiVersion: rbac.authorization.k8s.io/v1
    - kind: Role
    - name: storage-operator-leader-election-role
    - namespace: kube-system
    - require:
      - salt: Deploy Kubernetes service config objects
    - require_in:
      - salt: Deploy Kubernetes objects

Delete storage-operator ClusterRole:
  metalk8s_kubernetes.object_absent:
    - apiVersion: rbac.authorization.k8s.io/v1
    - kind: ClusterRole
    - name: storage-operator-manager-role
    - require:
      - salt: Deploy Kubernetes service config objects
    - require_in:
      - salt: Deploy Kubernetes objects

Delete storage-operator RoleBinding:
  metalk8s_kubernetes.object_absent:
    - apiVersion: rbac.authorization.k8s.io/v1
    - kind: RoleBinding
    - name: storage-operator-leader-election-rolebinding
    - namespace: kube-system
    - require:
      - salt: Deploy Kubernetes service config objects
    - require_in:
      - salt: Deploy Kubernetes objects

Delete storage-operator ClusterRoleBinding:
  metalk8s_kubernetes.object_absent:
    - apiVersion: rbac.authorization.k8s.io/v1
    - kind: ClusterRoleBinding
    - name: storage-operator-manager-rolebinding
    - require:
      - salt: Deploy Kubernetes service config objects
    - require_in:
      - salt: Deploy Kubernetes objects

Delete storage-operator ConfigMap:
  metalk8s_kubernetes.object_absent:
    - apiVersion: v1
    - kind: ConfigMap
    - name: storage-operator-manager-config
    - namespace: kube-system
    - require:
      - salt: Deploy Kubernetes service config objects
    - require_in:
      - salt: Deploy Kubernetes objects

Delete storage-operator Deployment:
  metalk8s_kubernetes.object_absent:
    - apiVersion: apps/v1
    - kind: Deployment
    - name: storage-operator-controller-manager
    - namespace: kube-system
    - wait:
        attempts: 30
        sleep: 10
    - require:
      - salt: Deploy Kubernetes service config objects
    - require_in:
      - salt: Deploy Kubernetes objects

{%- endif %}

Deploy Kubernetes objects:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.deployed
    - saltenv: metalk8s-{{ dest_version }}
    - require:
      - salt: Sync module on salt-master
      - salt: Downgrade etcd cluster

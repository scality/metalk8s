{%- set dest_version = pillar.metalk8s.cluster_version %}

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
      - metalk8s.orchestrate.etcd
    - saltenv: {{ saltenv }}
    - pillar:
        orchestrate:
          dest_version: {{ dest_version }}
    - require:
      - salt: Execute the upgrade prechecks

# In salt 2018.3 we can not do synchronous pillar refresh, so add a sleep
# see https://github.com/saltstack/salt/issues/20590
Wait for pillar refresh to complete:
  salt.function:
    - name: saltutil.refresh_pillar
    - tgt: '*'
    - require:
      - salt: Upgrade etcd cluster
  module.run:
    - test.sleep:
      - length: 20
    - require:
      - salt: Wait for pillar refresh to complete

{%- set cp_nodes = salt.metalk8s.minions_by_role('master') | sort %}
{%- set other_nodes = pillar.metalk8s.nodes.keys() | difference(cp_nodes) | sort %}

Ensure all apiservers serve a certificate for 127.0.0.1:
  salt.state:
    - tgt: {{ cp_nodes | join(",") }}
    - tgt_type: list
    - sls:
      - metalk8s.internal.upgrade.apiserver-cert-localhost
    - saltenv: {{ saltenv }}
    - batch: 1
    - require:
      - module: Wait for pillar refresh to complete

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

Install apiserver-proxy on {{ node }}:
  salt.state:
    - tgt: {{ node }}
    - sls:
      - metalk8s.kubernetes.apiserver-proxy
    - saltenv: {{ saltenv }}

Wait for API server to be available on {{ node }}:
  http.wait_for_successful_query:
  - name: https://127.0.0.1:7443/healthz
  - match: 'ok'
  - status: 200
  - verify_ssl: false
  - require:
    - module: Wait for pillar refresh to complete
    - salt: Install apiserver-proxy on {{ node }}
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
      - salt: Ensure all apiservers serve a certificate for 127.0.0.1
    - require_in:
      - salt: Deploy Kubernetes objects

    {#- Ugly but needed since we have jinja2.7 (`loop.previtem` added in 2.10) #}
    {%- set previous_node = node %}

  {%- endif %}

{%- endfor %}

{#- In MetalK8s-2.4.2 we added selector in nginx ingress controller DaemonSet,
    nginx ingress control plane controller Daemonset and nginx ingress default
    backend Deployment but `selector` are immutable field so, in this case,
    we cannot replace the object we need to first remove the current one and
    then deploy the desired one. #}
{#- For upgrade we should use the current version to check whether or not we
    need to remove the nginx ingress objects
    `if current_version < 2.4.2`
    but in orchestrate we are not able to known the current version so add an
    hack checking if the current object exist and has a component selector, as
    by default K8S add selector:
    ```
    matchLabels:
      app: nginx-ingress
      component: controller
      release: nginx-ingress
    ```
    when our current selector is
    ```
    matchLabels:
      app: nginx-ingress
      release: nginx-ingress
    ``` #}
{%- set nginx_ingress_ds = salt.metalk8s_kubernetes.get_object(
        kind='DaemonSet',
        apiVersion='apps/v1',
        name='nginx-ingress-controller',
        namespace='metalk8s-ingress'
    ) %}
{%- set nginx_ingress_control_plane_ds = salt.metalk8s_kubernetes.get_object(
        kind='DaemonSet',
        apiVersion='apps/v1',
        name='nginx-ingress-control-plane-controller',
        namespace='metalk8s-ingress'
    ) %}
{%- set nginx_ingress_deploy = salt.metalk8s_kubernetes.get_object(
        kind='Deployment',
        apiVersion='apps/v1',
        name='nginx-ingress-default-backend',
        namespace='metalk8s-ingress'
    ) %}
{%- set desired_selector = {
        'match_labels': {
            'app': 'nginx-ingress',
            'release': 'nginx-ingress'
        },
        'match_expressions': None
     } %}
{%- set desired_selector_control_plane = {
        'match_labels': {
            'app': 'nginx-ingress',
            'release': 'nginx-ingress-control-plane'
        },
        'match_expressions': None
     } %}
{%- if nginx_ingress_ds and
       nginx_ingress_ds.get('spec', {}).get('selector', {})
          != desired_selector %}

Delete old nginx ingress daemon set:
  metalk8s_kubernetes.object_absent:
    - name: nginx-ingress-controller
    - namespace: metalk8s-ingress
    - kind: DaemonSet
    - apiVersion: apps/v1
    - wait:
        attempts: 10
        sleep: 10
    - require_in:
      - salt: Sync module on salt-master

{%- endif %}
{%- if nginx_ingress_control_plane_ds and
       nginx_ingress_control_plane_ds.get('spec', {}).get('selector', {})
          != desired_selector_control_plane %}

Delete old nginx ingress control plane daemon set:
  metalk8s_kubernetes.object_absent:
    - name: nginx-ingress-control-plane-controller
    - namespace: metalk8s-ingress
    - kind: DaemonSet
    - apiVersion: apps/v1
    - wait:
        attempts: 10
        sleep: 10
    - require_in:
      - salt: Sync module on salt-master

{%- endif %}
{%- if nginx_ingress_deploy and
       nginx_ingress_deploy.get('spec', {}).get('selector', {})
          != desired_selector %}

Delete old nginx ingress deployment:
  metalk8s_kubernetes.object_absent:
    - name: nginx-ingress-default-backend
    - namespace: metalk8s-ingress
    - kind: Deployment
    - apiVersion: apps/v1
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
      - salt: Upgrade etcd cluster

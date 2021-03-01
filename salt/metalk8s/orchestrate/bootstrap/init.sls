{# Because of the grain lookup below, the bootstrap minion *must* be available
   before invoking this SLS, otherwise rendering will fail #}
{%- set grains_ret = salt.saltutil.cmd(
        tgt=pillar.bootstrap_id,
        fun='grains.get',
        kwarg={
            'key': 'metalk8s:control_plane_ip',
        },
    )
%}
{%- if pillar.bootstrap_id not in grains_ret %}
  {{- raise(
        "Failed to get grain metalk8s:control_plane_ip from '" ~ pillar.bootstrap_id
        ~ "' minion. Result: " ~ grains_ret | tojson
      )
  }}
{%- else %}
  {%- set bootstrap_control_plane_ip = grains_ret[pillar.bootstrap_id]['ret'] %}
{%- endif %}

{%- if 'metalk8s' in pillar
        and 'nodes' in pillar.metalk8s
        and pillar.bootstrap_id in pillar.metalk8s.nodes
        and pillar.metalk8s.nodes[pillar.bootstrap_id].version is not none %}
{% set version = pillar.metalk8s.nodes[pillar.bootstrap_id].version %}
{% else %}
{% set _, version = saltenv.split('-', 1) %}
{% endif %}

{%- set pillar_data = {
        'bootstrap_id': pillar.bootstrap_id,
        'is_bootstrap': True,
        'metalk8s': {
            'nodes': {
                '_errors': None,
                pillar.bootstrap_id: {
                    'roles': ['bootstrap', 'master', 'etcd', 'ca', 'infra'],
                    'version': version,
                },
            },
            'volumes': None,
            'endpoints': {
                'salt-master': {
                    'ip': bootstrap_control_plane_ip,
                    'ports': {
                        'api': 4507,
                    },
                },
                'repositories': {
                    'ip': bootstrap_control_plane_ip,
                    'ports': {
                        'http': 8080,
                    },
                },
            },
        },
    }
%}

Sync all custom types:
  salt.runner:
  - name: saltutil.sync_all
  - saltenv: {{ saltenv }}

Sync roster extmods:
  salt.runner:
  - name: saltutil.sync_roster
  - saltenv: {{ saltenv }}

Sync auth extmods:
  salt.runner:
  - name: metalk8s_saltutil.sync_auth
  - saltenv: {{ saltenv }}

Sync bootstrap minion:
  salt.function:
  - name: saltutil.sync_all
  - tgt: {{ pillar.bootstrap_id }}
  - kwarg:
      saltenv: metalk8s-{{ version }}

Deploy CA role on bootstrap minion:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - sls:
    - metalk8s.roles.ca
  - saltenv: metalk8s-{{ version }}
  - pillar: {{ pillar_data | tojson }}
  - require:
    - salt: Sync bootstrap minion

Bring bootstrap minion to highstate:
  salt.state:
  - tgt: {{ pillar.bootstrap_id }}
  - highstate: true
  - pillar: {{ pillar_data | tojson }}
  - require:
    - salt: Sync bootstrap minion
    - salt: Deploy CA role on bootstrap minion

Wait for API server to be available:
  http.wait_for_successful_query:
  - name: https://127.0.0.1:7443/healthz
  - match: 'ok'
  - status: 200
  - verify_ssl: false
  - require:
    - salt: Bring bootstrap minion to highstate

Configure bootstrap Node object:
  salt.runner:
  - name: state.orchestrate
  - mods:
    - metalk8s.kubernetes.mark-control-plane.deployed
  - saltenv: {{ saltenv }}
  - pillar: {{ pillar_data | tojson }}
  - require:
    - http: Wait for API server to be available

Update pillar on bootstrap minion after highstate:
  salt.function:
  - name: saltutil.refresh_pillar
  - tgt: {{ pillar.bootstrap_id }}
  - require:
    - salt: Configure bootstrap Node object

# From this point on, we assume `mine_functions` to function properly. Enforce
# this.
Update mine from bootstrap minion:
  salt.function:
  - name: mine.update
  - tgt: {{ pillar.bootstrap_id }}
  - require:
    - salt: Update pillar on bootstrap minion after highstate
    - salt: Configure bootstrap Node object

Deploy Kubernetes service config objects:
  salt.runner:
  - name: state.orchestrate
  - mods:
    - metalk8s.service-configuration.deployed
  - saltenv: {{ saltenv }}
  - pillar: {{ pillar_data | tojson }}
  - require:
    - http: Wait for API server to be available

Deploy Kubernetes objects:
  salt.runner:
  - name: state.orchestrate
  - mods:
    - metalk8s.deployed
  - saltenv: {{ saltenv }}
  - pillar: {{ pillar_data | tojson }}
  - require:
    - http: Wait for API server to be available
    - salt: Deploy Kubernetes service config objects

Store MetalK8s version in annotations:
  metalk8s_kubernetes.object_updated:
    - name: "kube-system"
    - kind: Namespace
    - apiVersion: v1
    - patch:
        metadata:
          annotations:
            metalk8s.scality.com/cluster-version: "{{ version }}"
    - require:
      - http: Wait for API server to be available

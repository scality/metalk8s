{%- set version = pillar.metalk8s.nodes[pillar.node_name].version %}

{%- if pillar['node_name'] not in salt['saltutil.runner']('manage.up') %}
Deploy salt-minion on a new node:
  salt.state:
    - ssh: true
    - roster: kubernetes
    - tgt: {{ pillar['node_name'] }}
    - saltenv: metalk8s-{{ version }}
    - sls:
      - metalk8s.roles.minion

Accept key:
  module.run:
    - saltutil.wheel:
      - key.accept
      - {{ pillar['node_name'] }}
    - require:
      - salt: Deploy salt-minion on a new node

Wait minion available:
  salt.runner:
    - name: metalk8s_saltutil.wait_minions
    - tgt: {{ pillar['node_name'] }}
    - require:
      - module: Accept key
    - require_in:
      - salt: Set grains
{%- endif %}

Set grains:
  salt.state:
    - tgt: {{ pillar['node_name'] }}
    - saltenv: metalk8s-{{ version }}
    - sls:
      - metalk8s.node.grains

Refresh the mine:
  salt.function:
    - name: mine.update
    - tgt: '*'

Run the highstate:
  salt.state:
    - tgt: {{ pillar['node_name'] }}
    - highstate: True
    - require:
      - salt: Set grains
      - salt: Refresh the mine

# Work-around for https://github.com/scality/metalk8s/pull/1028
Kill kube-controller-manager on all master nodes:
  salt.function:
    - name: ps.pkill
    - tgt: "{{ salt['metalk8s.minions_by_role']('master') | join(',') }}"
    - tgt_type: list
    - kwarg:
        pattern: kube-controller-manager
    - require:
      - salt: Run the highstate

{%- if 'etcd' in pillar.get('metalk8s', {}).get('nodes', {}).get(pillar['node_name'], {}).get('roles', []) %}

Register the node into etcd cluster:
  module.run:
    - metalk8s.add_etcd_node:
      - host: {{ pillar['node_name'] }}
    - require:
      - salt: Run the highstate

{%- endif %}

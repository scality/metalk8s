# This state is used for Salt migration:
#  - for upgrade from 2.6.x to 2.7.x (migration from Python2 to Python3)
#  - for downgrade from 2.7.x to 2.6.x (migration from Python3 to Python2)
#
# Salt migration cannot be done automatically by a salt state because of the
# change between Python2 and Python3
#
# NOTE: This orchestrate can be removed in `developement/2.8`

{%- set node_name = pillar.orchestrate.node_name %}
{%- set version = pillar.metalk8s.nodes[node_name].version %}

# Just retry on the salt minion state since this state only manage
# salt-minion package it's "ok" to just retry here
Install Salt-minion:
  salt.state:
    - tgt: {{ node_name }}
    - saltenv: metalk8s-{{ version }}
    - sls:
      - metalk8s.salt.minion.installed
    - timeout: 200
    - retry:
        attempts: 3
        interval: 60

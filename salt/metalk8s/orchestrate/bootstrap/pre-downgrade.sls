{%- set dest_version = pillar.metalk8s.cluster_version %}

Refresh CA minion:
  salt.state:
    - sls:
      - metalk8s.roles.ca
    - tgt: {{ pillar.metalk8s.ca.minion }}
    - saltenv: metalk8s-{{ dest_version }}
    - sync_mods: all

Prepare for Salt Master downgrade:
  salt.state:
    - sls:
      - metalk8s.salt.master.certs
    - tgt: {{ salt['metalk8s.minions_by_role']('bootstrap') | first }}
    - saltenv: metalk8s-{{ dest_version }}
    - sync_mods: all
    - require:
      - salt: Refresh CA minion

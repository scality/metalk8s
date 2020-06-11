Refresh CA minion:
  salt.state:
    - sls:
      - metalk8s.roles.ca
    - tgt: {{ pillar.metalk8s.ca.minion }}
    - saltenv: {{ saltenv }}
    - sync_mods: all

Prepare for Salt Master upgrade:
  salt.state:
    - sls:
      - metalk8s.salt.master.certs
    - tgt: {{ salt['metalk8s.minions_by_role']('bootstrap') | first }}
    - saltenv: {{ saltenv }}
    - sync_mods: all

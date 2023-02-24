# Include here all states that should be called after upgrading

include:
  - metalk8s.addons.prometheus-operator.post-upgrade
  - metalk8s.addons.ui.post-upgrade
  - metalk8s.addons.logging.loki.deployed.post-upgrade

Post upgrade on Bootstrap:
  salt.state:
    - sls:
      - metalk8s.internal.bootstrap.post-upgrade
    - tgt: {{ salt['metalk8s.minions_by_role']('bootstrap') | first }}
    - saltenv: {{ saltenv }}
    - sync_mods: all

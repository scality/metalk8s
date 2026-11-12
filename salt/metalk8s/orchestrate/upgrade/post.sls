# Include here all states that should be called after upgrading

include:
  - metalk8s.addons.prometheus-operator.post-upgrade
  - metalk8s.addons.ui.post-upgrade
  - metalk8s.addons.image-cache-agent.post-upgrade

Post upgrade on Bootstrap:
  salt.state:
    - sls:
      - metalk8s.internal.bootstrap.post-upgrade
    - tgt: {{ salt['metalk8s.minions_by_role']('bootstrap') | first }}
    - saltenv: {{ saltenv }}
    - sync_mods: all

{#- Only a 134 bootstrap wrote flat archives, so only that node has some. #}
Remove the flat archives from the image cache:
  salt.state:
    - sls:
      - metalk8s.image-cache.flat-archives-absent
    - tgt: {{ salt['metalk8s.minions_by_role']('bootstrap') | first }}
    - saltenv: {{ saltenv }}

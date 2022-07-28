# Include here all states that should be called after upgrading

include:
  - metalk8s.addons.prometheus-operator.post-upgrade
  - metalk8s.addons.ui.post-upgrade
  - metalk8s.addons.logging.fluent-bit.deployed.post-upgrade

{%- for node in pillar.metalk8s.nodes.keys() %}

Run post-upgrade on node {{ node }}:
  salt.state:
    - tgt: {{ node }}
    - sls:
      - metalk8s.kubernetes.cni.calico.post-upgrade
    - saltenv: {{ saltenv }}
    {%- if loop.previtem is defined %}
    - require:
      - salt: Run post-upgrade on node {{ loop.previtem }}
    {%- endif %}

{%- endfor %}

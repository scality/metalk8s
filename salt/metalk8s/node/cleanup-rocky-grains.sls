{#- Drop the legacy `os`/`os_family` overrides written by the removed
    metalk8s.node.rocky-linux-grains so the minion falls back to salt's
    native Rocky detection.
    Can be removed in development/135.0. #}

{%- if grains.get('osfullname') == 'Rocky Linux' %}

  {%- if grains.get('os') == 'CentOS' %}

Remove forced os grain:
  grains.absent:
    - name: os
    - destructive: True

  {%- endif %}

  {%- if grains.get('os_family') == 'RedHat' %}

Remove forced os_family grain:
  grains.absent:
    - name: os_family
    - destructive: True

  {%- endif %}

{%- endif %}

Refresh grains after Rocky workaround cleanup:
  module.run:
    - saltutil.sync_grains: []

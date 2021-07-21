{%- from "metalk8s/map.jinja" import metalk8s with context %}

include:
  - .installed
  - .restart

Configure salt minion:
  file.managed:
    - name: /etc/salt/minion.d/99-metalk8s.conf
    - source: salt://metalk8s/salt/minion/files/minion-99-metalk8s.conf.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: true
    - backup: false
    - defaults:
        debug: {{ metalk8s.debug }}
        {#- NOTE: We only consider a single master for the moment #}
        master_hostname: {{ metalk8s.endpoints['salt-master'][0].ip }}
        minion_id: {{ grains.id }}
        saltenv: {{ saltenv }}
    - watch_in:
      - cmd: Restart salt-minion

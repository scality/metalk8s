{%- from "metalk8s/map.jinja" import metalk8s with context %}

include:
  - .installed
  - .running

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
      master_hostname: {{ metalk8s.endpoints.get('salt-master', {}).ip }}
      minion_id: {{ grains.id }}
    - watch_in:
      - cmd: Restart salt-minion

Remove minion local conf:
  file.absent:
    - name: /etc/salt/minion.d/99-file-client-local.conf
    - require:
      - file: Configure salt minion
      - module: Ensure salt-minion running

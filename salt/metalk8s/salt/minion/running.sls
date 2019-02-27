Restart salt-minion:
  cmd.wait:
    - name: 'salt-call --local service.restart salt-minion'
    - bg: true

Wait until salt-minion restarted:
  module.wait:
    - test.sleep:
      - length: 10
    - watch:
      - cmd: Restart salt-minion

Ensure salt-minion running:
  service.running:
    - name: salt-minion
    - enable: True
    - require:
      - module: Wait until salt-minion restarted

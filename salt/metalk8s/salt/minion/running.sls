Restart salt-minion:
  cmd.wait:  # noqa: 213
    - name: 'salt-call --local service.restart salt-minion > /dev/null'

Wait until salt-minion restarted:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:test.sleep(10)
    - comment: Wait a bit for 'salt-minion' to restart
    - onchanges:
      - cmd: Restart salt-minion

Ensure salt-minion running:
  service.running:
    - name: salt-minion
    - enable: True
    - require:
      - test: Wait until salt-minion restarted
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:test.ping()
    - comment: Ran 'test.ping'
    - require:
      - service: Ensure salt-minion running

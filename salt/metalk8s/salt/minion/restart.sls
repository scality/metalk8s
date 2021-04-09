Restart salt-minion:
  cmd.wait:
    - name: 'salt-call --local service.restart salt-minion > /dev/null'
    - bg: True

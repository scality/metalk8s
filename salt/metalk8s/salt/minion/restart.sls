Restart salt-minion:
  cmd.wait:  # noqa: 213
    - name: 'salt-call --local service.restart salt-minion > /dev/null'
    - bg: True

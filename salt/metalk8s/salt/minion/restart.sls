Restart salt-minion:
  cmd.wait:  # noqa: 213
    - order: last
    - name: 'salt-call --local service.restart salt-minion > /dev/null'
    - bg: True

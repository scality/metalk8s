Restart salt-minion:
  cmd.wait:  # noqa: 213
    - order: last
    - name: 'sleep 30 && salt-call --local service.restart salt-minion > /dev/null'
    - bg: True

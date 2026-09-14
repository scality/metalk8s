# Restart the minion from a transient systemd unit, outside the
# salt-minion.service cgroup: since the unit uses KillMode=mixed (salt >=
# 3006.26) the stop phase of a restart waits for the whole cgroup, so a
# restarter living in it deadlocks until TimeoutStopSec then gets SIGKILLed.
# The sleep leaves time for the job running this state to complete and
# return before the minion goes down.
# Skip when a detached salt-minion upgrade is in flight (see
# `metalk8s.salt.minion.installed`): restarting mid-transaction could start
# a half-swapped minion, and the %posttrans restart brings up the minion
# with the fresh config anyway.
Restart salt-minion:
  cmd.wait:  # noqa: 213
    - order: last
    - name: >-
        systemd-run --unit metalk8s-salt-minion-restart --collect --
        sh -c 'sleep 5 && systemctl restart salt-minion'
    - unless: systemctl is-active --quiet metalk8s-salt-minion-upgrade

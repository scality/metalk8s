#
# State to manage salt minion.
#
# To restart salt-minion:
#   - watch_in:
#     - cmd: Restart salt-minion
#
# Available states
# ================
#
# * running   -> Ensure salt minion running
#

include:
  - .installed
  - .running

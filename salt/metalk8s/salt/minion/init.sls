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
# * local       -> Configure salt minion so that it can run in local mode
#                  (need to have access on the ISO, so only run it on the bootstrap)
# * installed   -> Install/Upgrade and enable salt minion
# * configured  -> Configure salt minion process
# * restart     -> Restart salt Minion if required `watch_in` set
#

include:
  - .configured

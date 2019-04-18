#
# State for kubelet
#
# All this state install and configure kubelet
#
# To restart kubelet include "running" state:
#   - watch_in:
#     - service: Ensure kubelet running
#
# Available states
# ================
#
# * installed   -> install kubelet
# * configured  -> configure kubelet
# * standalone  -> configure kubelet in standalone mode
# * running     -> ensure kubelet is enable and running
#
include:
  - .configured

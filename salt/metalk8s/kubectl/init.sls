#
# State to manage kubectl.
#
# Available states
# ================
#
# * installed   -> Ensure kubectl is installed
# * configured  -> Configure bash completion for kubectl
#

include:
  - .configured

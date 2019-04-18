#
# State to manage Scheduler deployment
#
# Available states
# ================
#
# * installed     -> deploy scheduler manifest
# * kubeconfig    -> create scheduler kubeconfig file
#
include:
  - .installed

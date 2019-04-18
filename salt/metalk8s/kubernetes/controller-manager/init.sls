#
# State to manage Controller Manager deployment
#
# Available states
# ================
#
# * installed     -> deploy controller-manager manifest
# * kubeconfig    -> create controller-manager kubeconfig file
#
include:
  - .installed

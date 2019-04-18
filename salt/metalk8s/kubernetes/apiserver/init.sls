#
# State to manage API server deployment
#
# Available states
# ================
#
# * installed     -> deploy apiserver manifest
# * kubeconfig    -> create admin kubeconfig file
#
include:
  - .installed
  - .kubeconfig

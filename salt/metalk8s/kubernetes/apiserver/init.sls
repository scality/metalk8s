#
# State to manage API server deployment
#
# Available states
# ================
#
# * installed     -> deploy apiserver manifest
# * kubeconfig    -> create admin kubeconfig file
# * cryptconfig   -> create apiserver encryption configuration
# * authnconfig   -> create apiserver authentication configuration
#
include:
  - .installed
  - .kubeconfig
  - .cryptconfig
  - .authnconfig

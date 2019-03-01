#
# State for kubeadm init etcd phase.
#
# Generates static Pod manifest file for local etcd.
#
# Available states
# ================
#
# * local               -> Generates the local etcd static Pod manifest
#

include:
  - .local

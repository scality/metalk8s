#
# State for kubeadm init etcd phase.
#
# Generates static Pod manifest file for local etcd.
#
# Available states
# ================
#
# * etcd               -> Generates the etcd static Pod manifest
#

include:
  - .etcd

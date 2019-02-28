#
# State for kubeadm init control-plane phase.
#
# Generates all static Pod manifest files necessary to establish the control
# plane.
#
# Available states
# ================
#
# * apiserver          -> Generates the kube-apiserver static Pod manifest
# * controller-manager -> Generates the kube-controller-manager static Pod
#                         manifest
# * scheduler          -> Generates the kube-scheduler static Pod manifest
#

include:
  - .apiserver
  - .controller-manager
  - .scheduler

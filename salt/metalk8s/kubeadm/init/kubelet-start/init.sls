#
# State for kubeadm init kubelet-start phase.
#
# The goal is to have a static kubelet running
#
# Available states
# ================
#
# * configured   -> configure and start/enable kubelet service
#

include:
  - .configured

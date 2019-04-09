#
# State preparation for kubeadm init preflight phase.
#
# The goal is to satisfy the checks executed by preflight:
#
# https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/#preflight-checks
#
# Available states
# ================
#
# * mandatory   -> prevent ERROR in preflight phase
# * recommended -> prevent WARNING in preflight phase
#
# List of checks
#
#

include:
  - .mandatory
  - .recommended

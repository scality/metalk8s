#
# State for kubeadm init certs phase.
#
# The goal is to have all the CA and certs for all services.
#
# Available states
# ================
#
# * ca        -> create the root CA server and advertise it
# * apiserver -> create the kube API server certificate using root CA

include:
  - .ca

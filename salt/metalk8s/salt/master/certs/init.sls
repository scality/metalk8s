#
# State to manage salt master certs
#
# Available states
# ================
#
# * etcd-client           -> generate salt master etcd client key and certificate
# * salt-api              -> generate Salt API key and certificate
#
include:
  # Some server certs are required to be published in K8s API by Salt master
  - metalk8s.addons.nginx-ingress-control-plane.certs
  - metalk8s.addons.nginx-ingress.certs
  - metalk8s.addons.dex.certs
  - metalk8s.backup.certs.server
  - .etcd-client
  - .salt-api

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
  - metalk8s.addons.nginx-ingress.certs
  - metalk8s.addons.nginx-ingress-control-plane.certs
  - metalk8s.addons.dex.certs
  - .etcd-client
  - .salt-api

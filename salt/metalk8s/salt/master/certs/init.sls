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
  - .etcd-client
  - .salt-api

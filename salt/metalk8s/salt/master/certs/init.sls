#
# State to manage salt master certs
#
# Available states
# ================
#
# * etcd-client           -> generate salt master etcd client key and certificate
#
include:
  - .etcd-client

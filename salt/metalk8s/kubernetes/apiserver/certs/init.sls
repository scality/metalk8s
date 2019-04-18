#
# State to manage apiserver certs
#
# Available states
# ================
#
# * etcd-client           -> generate apiserver etcd client key and certificate
# * front-proxy-client    -> generate front proxy client key and certificate
# * kubelet-client        -> generate apiserver kubelet client key and certificate
# * server                -> generate apiserver key and certificate
#
include:
  - .etcd-client
  - .front-proxy-client
  - .kubelet-client
  - .server

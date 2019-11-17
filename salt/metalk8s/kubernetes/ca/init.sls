#
# State to manage all kubernetes CA server
#
# Available states
# ================
#
# * kubernetes    -> manage kubernetes CA
# * etcd          -> manage etcd CA
# * front-proxy   -> manage front-proxy CA
#
include:
  - .kubernetes
  - .etcd
  - .front-proxy

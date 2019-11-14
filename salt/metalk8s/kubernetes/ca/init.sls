#
# State to manage all kubernetes CA server
#
# Available states
# ================
#
# * kubernetes    -> manage kubernetes CA
# * etcd          -> manage etcd CA
# * front-proxy   -> manage front-proxy CA
# * dex           -> manage dex CA
include:
  - .kubernetes
  - .etcd
  - .front-proxy
  - .dex

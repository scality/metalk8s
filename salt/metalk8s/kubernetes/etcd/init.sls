#
# State to manage etcd deployment
#
# Available states
# ================
#
# * prepared      -> setup etcd dependencies
# * installed     -> deploy etcd manifest
#
include:
  - .prepared
  - .installed

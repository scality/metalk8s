#
# State to manage etcd deployment
#
# Available states
# ================
#
# * installed     -> deploy etcd manifest
# * healthy       -> check health of etcd node
#
include:
  - .installed

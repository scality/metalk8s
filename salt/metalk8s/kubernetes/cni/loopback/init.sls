# When setting up a *master* and/or *etcd* node, we don't deploy Calico
# (and its configuration) on the server, because such node is not
# required to be part of the overlay network (it's not running any
# non-`hostNetwork` Pods, and shouldn't connect to any other
# non-`hostNetwork` Pods).
#
# However, as long as no CNI configuration is present, `kubelet`
# complains and the Node remains in `NotReady` state.
#
# We can work-around this by either
#
# - explaining this in documentation
# - unnecessarily deploying Calico on the node
# - providing another valid CNI configuration, e.g. for `localhost`
#
# The latter seem the right approach here: it'll still require
# documentation ('Why is my Pod not working on a non-node/infra node after
# I removed the taints?'), but doesn't unnecessarily impact the networking
# on a control-plane node, and doesn't keep Nodes in `NotReady` state even
# though they kind-of are.
#
# Fixes: #1087
# Fixes: https://github.com/scality/metalk8s/issues/1087

include:
  - .installed
  - .configured

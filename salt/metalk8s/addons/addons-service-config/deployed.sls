# Create the namespace before deploying configmap objects
include:
  - metalk8s.addons.prometheus-operator.deployed.namespace
  - metalk8s.addons.dex.deployed.namespace
  - .configmap

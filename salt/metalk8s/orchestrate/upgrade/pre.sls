# Include here all states that should be called before upgrading
# NOTE: This state should be called by salt-master using the saltenv of
# the destination version (salt-master should have been upgraded)

include:
  - metalk8s.addons.nginx-ingress.pre-upgrade
  - metalk8s.addons.nginx-ingress-control-plane.pre-upgrade
  - metalk8s.kubernetes.apiserver.pre-upgrade

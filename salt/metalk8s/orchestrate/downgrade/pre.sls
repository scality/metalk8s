# Include here all states that should be called before downgrading
# NOTE: This state should be called by salt-master using the saltenv of
# the current version (salt-master should not have been downgraded yet)

include:
  - metalk8s.addons.nginx-ingress.pre-downgrade
  - metalk8s.addons.nginx-ingress-control-plane.pre-downgrade

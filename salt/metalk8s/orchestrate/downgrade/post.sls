# Include here all states that should be called after downgrading

include:
  - metalk8s.addons.prometheus-operator.post-downgrade
  - metalk8s.addons.nginx-ingress.post-upgrade-downgrade
  - metalk8s.addons.nginx-ingress-control-plane.post-upgrade-downgrade

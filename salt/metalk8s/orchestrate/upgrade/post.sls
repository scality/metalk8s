# Include here all states that should be called after upgrading

include:
  - metalk8s.addons.prometheus-operator.post-upgrade
  - metalk8s.addons.nginx-ingress.post-upgrade-downgrade
  - metalk8s.addons.nginx-ingress-control-plane.post-upgrade-downgrade

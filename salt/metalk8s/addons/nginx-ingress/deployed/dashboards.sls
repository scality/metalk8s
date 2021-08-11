#!jinja | metalk8s_kubernetes
{%- from "metalk8s/addons/prometheus-operator/macros.j2"
    import configmaps_from_dashboards with context %}

{{ configmaps_from_dashboards([
      {
          'name': 'ingress-nginx',
          'title': 'NGINX Ingress Controller',
      },
      {
          'name': 'ingress-nginx-performance',
          'title': 'NGINX Ingress Request Handling Performance',
      },
]) }}

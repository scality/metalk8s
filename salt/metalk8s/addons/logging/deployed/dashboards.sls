#!jinja | metalk8s_kubernetes
{%- from "metalk8s/addons/prometheus-operator/macros.j2"
    import configmaps_from_dashboards with context %}

{{ configmaps_from_dashboards([
      {
          'name': 'fluent-bit',
          'title': 'Fluent Bit',
          'tags': ['logging'],
      },
      {
          'name': 'logs',
          'title': 'Logs',
          'tags': ['logging'],
      },
      {
          'name': 'loki',
          'title': 'Loki',
          'tags': ['logging'],
      },
]) }}

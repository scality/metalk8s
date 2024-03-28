#!jinja | metalk8s_kubernetes
{%- from "metalk8s/addons/prometheus-operator/macros.j2"
    import configmaps_from_dashboards with context %}

{{ configmaps_from_dashboards([
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

{#- In MetalK8s 128.0 we changed the fluent-bit dashboard to use
    the one from the helm chart. We need to remove the old one
    to avoid conflicts.
    This can be removed in `development/129.0` #}
Ensure old fluent-bit dashboard does no longer exists:
  metalk8s_kubernetes.object_absent:
    - name: fluent-bit-dashboard
    - namespace: metalk8s-monitoring
    - apiVersion: v1
    - kind: ConfigMap

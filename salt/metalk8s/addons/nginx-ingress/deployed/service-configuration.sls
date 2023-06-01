include:
  - .namespace

{%- set namespace = 'metalk8s-ingress' %}
{%- set name = 'metalk8s-ingress-controller-config' %}

{%- set ingress_service_config = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace=namespace,
        name=name
  )
%}

{%- if ingress_service_config is none %}

Create Ingress ServiceConfiguration (metalk8s-ingress/metalk8s-ingress-controller-config):
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: {{ name }}
          namespace: {{ namespace }}
        data:
          config.yaml: |-
            apiVersion: addons.metalk8s.scality.com/v1alpha2
            kind: IngressControllerConfig
            spec: {}


{%- else %}

Ingress ServiceConfiguration already exists:
  test.succeed_without_changes: []

{%- endif %}

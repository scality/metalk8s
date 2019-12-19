{%- set dest_version = pillar.metalk8s.cluster_version %}

{#- In MetalK8s-2.4.2 we added selector in nginx ingress control plane
    controller DaemonSet but `selector` are immutable
    field so, in this case, we cannot replace the object we need to first
    remove the current one and then deploy the desired one. #}
{%- set nginx_ingress_cp_ds = salt.metalk8s_kubernetes.get_object(
        kind='DaemonSet',
        apiVersion='apps/v1',
        name='nginx-ingress-control-plane-controller',
        namespace='metalk8s-ingress'
    ) %}

{#- Only do it `if current_version < 2.4.2` #}
{#- NOTE: If no version consider it's a 2.4.0 or 2.4.1 as version label was
    added just after. #}

{%- if nginx_ingress_cp_ds and
       salt.pkg.version_cmp(
          nginx_ingress_cp_ds.get('metadata', {}).get('labels', {}).get(
            'metalk8s.scality.com/version', '2.4.1'
          ),
          '2.4.2'
       ) == -1 %}

Delete old nginx ingress control plane daemon set:
  metalk8s_kubernetes.object_absent:
    - name: nginx-ingress-control-plane-controller
    - namespace: metalk8s-ingress
    - kind: DaemonSet
    - apiVersion: apps/v1
    - wait:
        attempts: 10
        sleep: 10

{%- else %}

Nginx ingress control plane daemon set already ready for upgrade:
  test.succeed_without_changes: []

{%- endif %}

{%- set dest_version = pillar.metalk8s.cluster_version %}

{#- In MetalK8s-2.4.2 we added selector in nginx ingress controller DaemonSet
    and nginx ingress default backend Deployment but `selector` are immutable
    field so, in this case, we cannot replace the object we need to first
    remove the current one and then deploy the desired one. #}
{%- set nginx_ingress_ds = salt.metalk8s_kubernetes.get_object(
        kind='DaemonSet',
        apiVersion='apps/v1',
        name='nginx-ingress-controller',
        namespace='metalk8s-ingress'
    ) %}
{%- set nginx_ingress_deploy = salt.metalk8s_kubernetes.get_object(
        kind='Deployment',
        apiVersion='apps/v1',
        name='nginx-ingress-default-backend',
        namespace='metalk8s-ingress'
    ) %}

{#- Only do it `if current_version < 2.4.2` #}
{#- NOTE: If no version consider it's a 2.4.0 or 2.4.1 as version label was
    added just after. #}

{%- if nginx_ingress_ds and
       salt.pkg.version_cmp(
          nginx_ingress_ds.get('metadata', {}).get('labels', {}).get(
            'metalk8s.scality.com/version', '2.4.1'
          ),
          '2.4.2'
       ) == -1 %}

Delete old nginx ingress daemon set:
  metalk8s_kubernetes.object_absent:
    - name: nginx-ingress-controller
    - namespace: metalk8s-ingress
    - kind: DaemonSet
    - apiVersion: apps/v1
    - wait:
        attempts: 10
        sleep: 10

{%- else %}

Nginx ingress daemon set already ready for upgrade:
  test.succeed_without_changes: []

{%- endif %}

{%- if nginx_ingress_deploy and
       salt.pkg.version_cmp(
          nginx_ingress_deploy.get('metadata', {}).get('labels', {}).get(
            'metalk8s.scality.com/version', '2.4.1'
          ),
          '2.4.2'
       ) == -1 %}

Delete old nginx ingress deployment:
  metalk8s_kubernetes.object_absent:
    - name: nginx-ingress-default-backend
    - namespace: metalk8s-ingress
    - kind: Deployment
    - apiVersion: apps/v1
    - wait:
        attempts: 10
        sleep: 10

{%- else %}

Nginx ingress deployment already ready for upgrade:
  test.succeed_without_changes: []

{%- endif %}

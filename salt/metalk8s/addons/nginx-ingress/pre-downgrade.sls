{%- set dest_version = pillar.metalk8s.cluster_version %}

{#- In MetalK8s-2.4.2 we added selector in nginx ingress controller DaemonSet
    and nginx ingress default backend Deployment but `selector` are immutable
    field so, in this case, we cannot replace the object we need to first
    remove the current one and then deploy the desired one. #}
{#- Only do it `if dest_version < 2.4.2` #}
{%- if salt.pkg.version_cmp(dest_version, '2.4.2') == -1 %}

Delete old nginx ingress daemon set:
  metalk8s_kubernetes.object_absent:
    - name: nginx-ingress-controller
    - namespace: metalk8s-ingress
    - kind: DaemonSet
    - apiVersion: apps/v1
    - wait:
        attempts: 10
        sleep: 10

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

Nginx ingress already ready for downgrade:
  test.succeed_without_changes: []

{%- endif %}

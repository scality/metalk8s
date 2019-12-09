{%- set dest_version = pillar.metalk8s.cluster_version %}

{#- In MetalK8s-2.4.2 we added selector in nginx ingress control plane
    controller DaemonSet but `selector` are immutable
    field so, in this case, we cannot replace the object we need to first
    remove the current one and then deploy the desired one. #}
{#- For upgrade we should use the current version to check whether or not we
    need to remove the nginx ingress control plane objects
    `if current_version < 2.4.2`
    but in orchestrate we are not able to known the current version so add an
    hack checking if the current object exist and has a component selector, as
    by default K8S add selector:
    ```
    matchLabels:
      app: nginx-ingress
      component: controller
      release: nginx-ingress-control-plane
    ```
    when our current selector is
    ```
    matchLabels:
      app: nginx-ingress
      release: nginx-ingress-control-plane
    ``` #}
{%- set nginx_ingress_control_plane_ds = salt.metalk8s_kubernetes.get_object(
        kind='DaemonSet',
        apiVersion='extensions/v1beta1',
        name='nginx-ingress-control-plane-controller',
        namespace='metalk8s-ingress'
    ) %}
{%- set desired_selector = {
        'match_labels': {
            'app': 'nginx-ingress',
            'release': 'nginx-ingress-control-plane'
        },
        'match_expressions': None
     } %}

{%- if nginx_ingress_control_plane_ds and
       nginx_ingress_control_plane_ds.get('spec', {}).get('selector', {})
          != desired_selector %}

Delete old nginx ingress control plane daemon set:
  metalk8s_kubernetes.object_absent:
    - name: nginx-ingress-control-plane-controller
    - namespace: metalk8s-ingress
    - kind: DaemonSet
    - apiVersion: extensions/v1beta1
    - wait:
        attempts: 10
        sleep: 10

{%- else %}

Nginx ingress control plane daemon set already ready for upgrade:
  test.succeed_without_changes: []

{%- endif %}

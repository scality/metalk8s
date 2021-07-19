{#- With new Dex Helm chart the Deployment label selector changed but this field
    is immutable so we need to remove the deployment in order to be able to deploy
    the new one #}
{#- NOTE: This can be removed in development/2.11 #}

{%- set dex_deploy = salt.metalk8s_kubernetes.get_object(
        kind='Deployment',
        apiVersion='apps/v1',
        name='dex',
        namespace='metalk8s-auth'
    ) %}

{#- Only remove it `if current_version < 2.10.0` #}

{%- if dex_deploy and
       salt.pkg.version_cmp(
         dex_deploy['metadata']['labels']['metalk8s.scality.com/version'],
        '2.10.0'
      ) == -1 %}

Delete old Dex Deployment:
  metalk8s_kubernetes.object_absent:
    - name: dex
    - namespace: metalk8s-auth
    - kind: Deployment
    - apiVersion: apps/v1
    - wait:
        attempts: 20
        sleep: 10

{%- endif %}

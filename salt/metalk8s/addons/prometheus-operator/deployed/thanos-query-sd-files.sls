include:
  - .namespace

{%- set thanos_query_sd_files = salt.metalk8s_kubernetes.get_object(
        kind='ConfigMap',
        apiVersion='v1',
        namespace='metalk8s-monitoring',
        name='thanos-query-sd-files',
  )
%}

{#- Never replace this ConfigMap: its content is managed by MetalK8s users and must survive re-apply. #}
{%- if thanos_query_sd_files is none %}

Create thanos-query-sd-files ConfigMap:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: thanos-query-sd-files
          namespace: metalk8s-monitoring
          labels:
            app.kubernetes.io/component: query
            app.kubernetes.io/instance: thanos

{%- else %}

thanos-query-sd-files ConfigMap already exists:
  test.succeed_without_changes: []

{%- endif %}

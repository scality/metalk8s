{#- Deletes the MetalK8s boot cache resources of any other version, so that
    the agent removes their directories and node labels. Like
    `prometheus-operator/post-cleanup.sls`, by label: a variant the current
    version dropped goes too, and the version upgraded from does not matter,
    so an interrupted or resumed upgrade ends the same. The pre-upgrade already
    waited for every deployed node to sync the current resources. #}

{%- set previous = salt.metalk8s_kubernetes.list_objects(
        kind='ImageCache',
        apiVersion='image-cache.scality.com/v1alpha1',
        label_selector=[
            'app.kubernetes.io/part-of=metalk8s',
            'metalk8s.scality.com/version!=' ~ pillar.metalk8s.cluster_version,
        ] | join(','),
    ) %}

{%- for name in previous | map(attribute='metadata.name') | sort %}

Delete the {{ name }} ImageCache:
  metalk8s_kubernetes.object_absent:
    - name: {{ name }}
    - kind: ImageCache
    - apiVersion: image-cache.scality.com/v1alpha1

{%- else %}

No ImageCache of another version:
  test.succeed_without_changes

{%- endfor %}

{%- from "metalk8s/image-cache/variants.jinja" import image_cache_variants with context %}

{#- Deletes the boot cache resources of any other version, so that the agent
    removes their directories and node labels. Another ImageCache, even one
    Salt created, is left alone. By name, since this runs with no knowledge of
    the version upgraded from: whatever is not the current version goes,
    whichever upgrade left it. The pre-upgrade already waited for every
    deployed node to sync the current resources. #}

{%- set current = image_cache_variants.values() | map(attribute='name') | list %}
{%- set found = salt.metalk8s_kubernetes.list_objects(
        kind='ImageCache',
        apiVersion='image-cache.scality.com/v1alpha1',
        label_selector='app.kubernetes.io/managed-by=salt',
    ) %}
{%- set previous = [] %}
{%- for name in found | map(attribute='metadata.name') | reject('in', current) %}
  {%- for variant in image_cache_variants if name.startswith(variant ~ '-') %}
    {%- do previous.append(name) %}
  {%- endfor %}
{%- endfor %}

{%- for name in previous | sort %}

Delete the {{ name }} ImageCache:
  metalk8s_kubernetes.object_absent:
    - name: {{ name }}
    - kind: ImageCache
    - apiVersion: image-cache.scality.com/v1alpha1

{%- else %}

No ImageCache of another version:
  test.succeed_without_changes

{%- endfor %}

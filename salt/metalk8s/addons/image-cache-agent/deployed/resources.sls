{%- from "metalk8s/repo/macro.sls" import build_registry_image_name with context %}
{%- from "metalk8s/image-cache/variants.jinja" import image_cache_variants with context %}

{#- Declares the boot cache of the current version, one ImageCache per
    variant. Each variant holds only what the worker one does not, so a node
    with several roles keeps no image twice.

    Applying it again replaces each resource with the same name, so nothing
    is duplicated. A new registry endpoint only reaches the nodes that have
    not synced yet: the agent never pulls a synced directory again. #}

{%- for variant, image_cache in image_cache_variants.items() %}

Create the {{ variant }} ImageCache:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: image-cache.scality.com/v1alpha1
        kind: ImageCache
        metadata:
          # NOTE: Must match the name `imagecachectl` gave the directory at
          # bootstrap and at join, see `metalk8s/image-cache/provisioned.sls`.
          # With the same name, the agent adopts it with no pull.
          name: {{ image_cache.name }}
        spec:
  {%- if image_cache.node_selector %}
          nodeSelector: {{ image_cache.node_selector | tojson }}
  {%- endif %}
          # NOTE: The agent resolves the source itself, not through
          # containerd, so it needs the address of the registry and not the
          # name only the containerd mirror configuration knows.
          source: {{ build_registry_image_name(image_cache.image_name) }}
    # NOTE: The CRD is created right before, in the same run. Give the API
    # server a moment to serve the new kind.
    - retry:
        attempts: 5
        interval: 5
{%- endfor %}

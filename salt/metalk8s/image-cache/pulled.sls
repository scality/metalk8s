{%- from "metalk8s/map.jinja" import image_cache with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/repo/macro.sls" import build_registry_image_name with context %}
{%- from "metalk8s/image-cache/variants.jinja" import image_cache_variants with context %}

{#- Fills the image cache of a new node from the cluster registry.

    Every node gets the worker variant: it holds what any node needs to start
    its Pods again without the registry. Only a node deployed for the first
    time applies it, see `orchestrate/deploy_node.sls`. From there, the image
    cache agent caches each new version.

    Ordering this against the kubelet is left to the caller, so that this SLS
    stays applicable on its own. #}

{%- if kubelet.container_engine == 'containerd' %}

{%- set resource = image_cache_variants.worker %}

{%- set endpoints = metalk8s.endpoints.repositories %}
{%- if not endpoints | is_list %}
  {%- set endpoints = [endpoints] %}
{%- endif %}
{%- if not endpoints %}
  {{ raise('Missing address of the repositories endpoint') }}
{%- endif %}

include:
  - .installed

Pull the worker boot cache from the registry:
  metalk8s_image_cache.imported:
    # NOTE: The name of the ImageCache resource that later owns this
    # directory, so that the agent adopts it.
    - name: {{ resource.name }}
    # NOTE: One reference per registry endpoint, tried in order, as
    # containerd does: the first endpoint down must not stop the join.
    - source:
{%- for endpoint in endpoints %}
      - {{ build_registry_image_name(resource.image_name, endpoint) }}
{%- endfor %}
    - cache_path: {{ image_cache.directory }}
    # NOTE: The registry endpoints serve plain HTTP.
    - plain_http: True
    # NOTE: Per endpoint. A registry that accepts the connection and stops
    # answering would otherwise hold the join forever.
    - timeout: 600
    - require:
      - file: Create the image cache directory
      - metalk8s_package_manager: Install imagecachectl

Import the pulled boot cache archives into containerd:
  module.run:
    # NOTE: A restart and not a start, and right away rather than on the next
    # tick of the timer. See `provisioned.sls` for why.
    - service.restart:
      - name: containerd-image-preload.service
    - onchanges:
      - metalk8s_image_cache: Pull the worker boot cache from the registry
    - require:
      - service: Ensure containerd image preload timer running

{%- else %}

No image cache to pull:
  test.succeed_without_changes

{%- endif %}

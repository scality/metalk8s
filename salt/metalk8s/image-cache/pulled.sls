{%- from "metalk8s/map.jinja" import image_cache with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}
{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_registry_image_name with context %}

{#- Fills the image cache of a joining node from the cluster registry.

    Every node gets the worker variant: it holds what any node needs to start
    its Pods again without the registry. The bootstrap node applies this SLS
    too, and finds the archives `provisioned.sls` already wrote, so it does
    nothing there.

    Ordering this against the kubelet is left to the role that applies both,
    so that this SLS stays applicable on its own. #}

{%- if kubelet.container_engine == 'containerd' %}

{%- set image_name = 'metalk8s-boot-cache-worker' %}
{%- set image_version = repo.images.get(image_name, {}).get('version') %}
{%- if not image_version %}
  {{ raise('Missing version information for "' ~ image_name ~ '"') }}
{%- endif %}

include:
  - .installed

Pull the worker boot cache from the registry:
  metalk8s_image_cache.imported:
    # NOTE: Must match the ImageCache resource that later owns this
    # directory: `<variant>-<version>`, with dots replaced by dashes.
    - name: worker-{{ image_version | replace('.', '-') }}
    - source: {{ build_registry_image_name(image_name) }}
    - cache_path: {{ image_cache.directory }}
    # NOTE: The registry endpoints serve plain HTTP.
    - plain_http: True
    - require:
      - file: Create the image cache directory
      - metalk8s_package_manager: Install imagecachectl

# NOTE: Not the ID `provisioned.sls` uses for the same restart. Both SLS can
# land in one run, and Salt refuses an ID declared twice.
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

The worker boot cache is in place:
  test.succeed_without_changes:
    - require:
      - metalk8s_image_cache: Pull the worker boot cache from the registry
      - module: Import the pulled boot cache archives into containerd

{%- else %}

# NOTE: Same ID as above, so that a role can require it in both branches.
The worker boot cache is in place:
  test.succeed_without_changes

{%- endif %}

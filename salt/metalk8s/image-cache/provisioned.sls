{%- from "metalk8s/map.jinja" import image_cache with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{#- Fills the image cache of the bootstrap node from the boot cache images
    shipped on the ISO.

    This is the cold path: no registry to pull from yet, so the archives come
    out of the ISO. This node holds the control plane, etcd and workloads, so
    it gets every variant. A joining node pulls its cache, see `pulled.sls`.

    Ordering this against the kubelet is left to the role that applies both,
    so that this SLS stays applicable on its own.

    The boot cache images are only on an ISO built with `WITH_BOOT_CACHE`,
    and only such an ISO lists a version for them: without one there is
    nothing to provision, and the node boots as it did before the cache. #}

{%- if kubelet.container_engine == 'containerd' %}

{%- set archives = salt.metalk8s.get_archives() %}

include:
  - .installed
  - metalk8s.archives.mounted

{%- for variant in ['worker', 'control-plane', 'etcd'] %}
  {%- set image_name = 'metalk8s-boot-cache-' ~ variant %}
  {%- set image_version = repo.images.get(image_name, {}).get('version') %}
  {%- if not image_version %}
    {{ raise('Missing version information for "' ~ image_name ~ '"') }}
  {%- endif %}

Import the {{ variant }} boot cache from the ISO:
  metalk8s_image_cache.imported:
    # NOTE: Must match the ImageCache resource that later owns this
    # directory: `<variant>-<version>`, with dots replaced by dashes.
    - name: {{ variant }}-{{ image_version | replace('.', '-') }}
    - source: {{ archives[saltenv].path }}/images/{{
        image_name }}-{{ image_version }}.tar
    - cache_path: {{ image_cache.directory }}
    - require:
      - file: Create the image cache directory
      - metalk8s_package_manager: Install imagecachectl
      # NOTE: The source is read from the mounted ISO. The bootstrap role
      # happens to include the mount before this state, but relying on the
      # include order of another formula is not a dependency.
      - sls: metalk8s.archives.mounted
{%- endfor %}

Import the boot cache archives into containerd:
  module.run:
    # NOTE: A restart and not a start. The timer may have fired while the
    # archives were still being written, and systemd merges a `start` into a
    # start job already in flight: the request would return happy while the
    # run it joined had already listed the directory. A restart is a job of
    # its own, so it sees every archive.
    - service.restart:
      - name: containerd-image-preload.service
    # NOTE: The timer is what keeps the cache imported over the life of the
    # node, but it only fires every 10 minutes, and it may well have fired
    # already, before there was anything to import. Waiting for the next one
    # would let the kubelet start with no images, so run the service once,
    # here, as soon as the archives land.
    - onchanges:
      - metalk8s_image_cache: Import the worker boot cache from the ISO
      - metalk8s_image_cache: Import the control-plane boot cache from the ISO
      - metalk8s_image_cache: Import the etcd boot cache from the ISO
    - require:
      - service: Ensure containerd image preload timer running

{%- else %}

No image cache to provision:
  test.succeed_without_changes

{%- endif %}

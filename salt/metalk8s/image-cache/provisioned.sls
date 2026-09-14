{%- from "metalk8s/map.jinja" import image_cache with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{#- Fills the image cache from the boot cache image shipped on the ISO.

    This is the cold path: first node, no registry to pull from and no
    Kubernetes to run the image cache agent, so the archives come out of the
    ISO. Joining nodes are MK8S-394, upgrades are MK8S-167.

    Ordering this against the kubelet is left to the role that applies both,
    so that this SLS stays applicable on its own.

    Only the control plane variant is handled here. The worker and registry
    variants land with MK8S-380 and MK8S-394, which is also where picking a
    variant per node role belongs. #}

{%- if kubelet.container_engine == 'containerd' %}

{%- set image_name = 'metalk8s-boot-cache-control-plane' %}
{%- set image_version = repo.images.get(image_name, {}).get('version') %}
{%- if not image_version %}
  {{ raise('Missing version information for "' ~ image_name ~ '"') }}
{%- endif %}

{%- set archives = salt.metalk8s.get_archives() %}

include:
  - .installed
  - metalk8s.archives.mounted

Create the image cache directory:
  file.directory:
    - name: {{ image_cache.directory }}
    - user: root
    - group: root
    - mode: '0755'
    - makedirs: True

Provision the boot cache:
  metalk8s_image_cache.provisioned:
    - name: {{ image_cache.directory }}
    - source: {{ archives[saltenv].path }}/images/{{
        image_name }}-{{ image_version }}.tar
    - require:
      - file: Create the image cache directory
      # NOTE: The source is read from the mounted ISO. The bootstrap role
      # happens to include the mount before this state, but relying on the
      # include order of another formula is not a dependency.
      - sls: metalk8s.archives.mounted

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
      - metalk8s_image_cache: Provision the boot cache
    - require:
      - service: Ensure containerd image preload timer running

{%- else %}

No image cache to provision:
  test.succeed_without_changes

{%- endif %}

{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import image_cache with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}

{%- if kubelet.container_engine == 'containerd' %}

include:
  - metalk8s.container-engine.containerd.installed

Install containerd image preload:
  {{ pkg_installed('containerd-image-preload') }}
    - require:
      - test: Repositories configured
      # NOTE: The package requires `containerd`, a virtual name the
      # `containerd.io` package we ship provides. Ordering the two keeps a
      # fresh node from resolving that dependency to another provider.
      - metalk8s_package_manager: Install containerd

Configure containerd image preload:
  file.managed:
    - name: /etc/sysconfig/containerd-image-preload
    - user: root
    - group: root
    - mode: '0644'
    # NOTE: The package ships this file as `%config(noreplace)`, so it is
    # what the preload script reads and RPM will not touch it again. Salt
    # owns it from here, otherwise the cache directory the states write to
    # and the one the timer imports from could drift apart.
    - contents:
      - "# Managed by Salt, see metalk8s.image-cache"
      - IMAGE_CACHE_DIR={{ image_cache.directory }}
      - IMAGE_PLATFORM={{ image_cache.platform }}
    - require:
      - metalk8s_package_manager: Install containerd image preload

{#- `TimeoutStartSec=0` means no limit to systemd, and a value it cannot parse
    is ignored, so either would let a stuck import block the kubelet. #}
{%- set preload_timeout = image_cache.preload_timeout | int %}
{%- if preload_timeout <= 0 %}
  {{ raise('image_cache.preload_timeout must be a positive number of seconds, got "' ~ image_cache.preload_timeout ~ '"') }}
{%- endif %}

# NOTE: A unit of its own and not a drop-in on the packaged service, which the
# timer also runs every 10 minutes: the order before the kubelet and the time
# limit must only apply to the import at boot.
Install containerd image preload boot service:
  file.managed:
    - name: /etc/systemd/system/containerd-image-preload-boot.service
    - source: salt://{{ slspath }}/files/containerd-image-preload-boot.service.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - context:
        timeout: {{ preload_timeout }}
    - require:
      # NOTE: The unit runs the script the package installs.
      - metalk8s_package_manager: Install containerd image preload

# NOTE: Only enabled, not started: it runs at the next boot. Until then, the
# timer imports the cache. The systemd service module reloads systemd itself
# when the unit file is new or changed.
Enable containerd image preload at boot:
  service.enabled:
    - name: containerd-image-preload-boot.service
    - require:
      - file: Install containerd image preload boot service

Ensure containerd image preload timer running:
  service.running:
    - name: containerd-image-preload.timer
    - enable: True
    - require:
      - metalk8s_package_manager: Install containerd image preload
      # NOTE: A `require` and not a `watch_in`: the service reads the
      # environment file every time it runs, so a changed value is picked up
      # on the next tick without restarting the timer.
      - file: Configure containerd image preload
      # NOTE: The timer fires as soon as it starts (`OnBootSec=0`), then
      # every 10 minutes, and the service imports into a running containerd,
      # so wait for the engine rather than let the first run fail.
      - test: Ensure containerd is ready

{%- else %}

No containerd to preload images into:
  test.succeed_without_changes

{%- endif %}

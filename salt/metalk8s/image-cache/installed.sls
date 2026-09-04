{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}

{%- if kubelet.container_engine == 'containerd' %}

include:
  - metalk8s.repo
  - metalk8s.container-engine.containerd.installed
  - metalk8s.container-engine.containerd.running

Install containerd image preload:
  {{ pkg_installed('containerd-image-preload') }}
    - require:
      - test: Repositories configured
      # NOTE: The package requires `containerd`, a virtual name the
      # `containerd.io` package we ship provides. Ordering the two keeps a
      # fresh node from resolving that dependency to another provider.
      - metalk8s_package_manager: Install containerd

Ensure containerd image preload timer running:
  service.running:
    - name: containerd-image-preload.timer
    - enable: True
    - require:
      - metalk8s_package_manager: Install containerd image preload
      # NOTE: The timer fires as soon as it starts (`OnBootSec=0`), then
      # every 10 minutes, and the service imports into a running containerd,
      # so wait for the engine rather than let the first run fail.
      - test: Ensure containerd is ready

{%- else %}

No containerd to preload images into:
  test.succeed_without_changes

{%- endif %}

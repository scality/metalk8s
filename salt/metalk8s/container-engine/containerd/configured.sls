{% from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - .installed
  - .running

{%- set pause_version = repo.images.pause.version %}

Inject pause image:
  # The `containerd` states require the `cri` module, which requires `crictl`
  containerd.image_managed:
    - name: k8s.gcr.io/pause:{{ pause_version }}
    - archive_path: salt://{{ slspath }}/files/pause-{{ pause_version }}.tar
    - require:
      - metalk8s_package_manager: Install and configure cri-tools

{% from "metalk8s/map.jinja" import metalk8s with context %}

include:
  - .installed
  - .running

Inject pause image:
  # The `containerd` states require the `cri` module, which requires `crictl`
  file.managed:
    - name: /tmp/pause-3.1.tar
    - source: salt://{{ slspath }}/files/pause-3.1.tar
    - unless: >-
        ctr -n k8s.io image ls -q | grep k8s.gcr.io/pause | grep 3\\.1
    - require:
      - sls: metalk8s.container-engine.containerd.running
  containerd.image_managed:
    - name: k8s.gcr.io/pause:3.1
    - archive_path: /tmp/pause-3.1.tar
    - require:
      - file: Inject pause image
      - metalk8s_package_manager: Install and configure cri-tools

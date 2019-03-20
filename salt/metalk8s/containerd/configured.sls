{% from "metalk8s/map.jinja" import metalk8s with context %}

{# One day this should be transferred from the fileserver #}
{% set pause_image_archive =
    metalk8s.iso_root_path ~ '/salt/metalk8s/containerd/files/pause-3.1.tar'
%}

include:
  - .installed

Start and enable containerd:
  service.running:
    - name: containerd
    - enable: True
    - require:
      - pkg: Install containerd

Inject pause image:
  # The `containerd` states require the `cri` module, which requires `crictl`
  cmd.run:
    - name: >-
        ctr -n k8s.io image import \
            --base-name k8s.gcr.io/pause \
            {{ pause_image_archive }}
    - unless: >-
        ctr -n k8s.io image ls -q | grep k8s.gcr.io/pause | grep 3\\.1
    - require:
      - service: Start and enable containerd

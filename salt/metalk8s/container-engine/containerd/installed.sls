{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include:
  - metalk8s.repo

Install container-selinux:
  {{ pkg_installed('container-selinux') }}
    - require:
      - test: Repositories configured

Install runc:
  {{ pkg_installed('runc') }}
    - require:
      - test: Repositories configured
      - pkg: Install container-selinux

Install containerd:
  {{ pkg_installed('containerd') }}
    - require:
      - test: Repositories configured
      - pkg: Install runc
      - pkg: Install container-selinux

Configure registry IP in containerd conf:
  file.managed:
    - name: /etc/containerd/config.toml
    - makedirs: true
    - contents: |
        [plugins]
          [plugins.cri]
            [plugins.cri.registry]
              [plugins.cri.registry.mirrors]
                [plugins.cri.registry.mirrors."{{ pillar.registry_ip }}"]
                  endpoint = ["http://{{ pillar.registry_ip }}:5000"]
    - require:
      - pkg: Install containerd

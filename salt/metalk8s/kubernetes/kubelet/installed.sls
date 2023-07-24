{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}

include:
  - metalk8s.repo
  - metalk8s.container-engine

Install kubelet:
  {{ pkg_installed('kubelet') }}
    - require:
      - test: Repositories configured

# When upgrading kubelet on centos7 we have error when trying to restart or get
# status of the kubelet service
# $ systemctl status kubelet
# Failed to get properties: Access denied
#
# Workaround: Reload systemctl
Reload systemctl:
  module.run:
    - service.systemctl_reload: []
    - onchanges:
      - metalk8s_package_manager: Install kubelet

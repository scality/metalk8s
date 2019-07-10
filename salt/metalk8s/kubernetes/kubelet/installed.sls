{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}

include:
  - metalk8s.repo
{%- if kubelet.container_engine %}
  - metalk8s.container-engine.{{ kubelet.container_engine }}
{%- endif %}

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
  module.wait:
    - service.systemctl_reload: []
    - watch:
      - metalk8s_package_manager: Install kubelet

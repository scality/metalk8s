{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo
  - metalk8s.runc

Install container-selinux:
  {{ pkg_installed('container-selinux') }}
{%- if repo.online_mode %}
    - sources:
      - container-selinux: ftp://ftp.scientificlinux.org/linux/scientific/7x/external_products/extras/x86_64/container-selinux-2.77-1.el7_6.noarch.rpm
{%- endif %}
    - require_in:
      - pkg: Install runc
    - require:
      - test: Repositories configured

Install containerd:
  {{ pkg_installed('containerd') }}
    - require:
      - test: Repositories configured
      - pkg: Install runc
      - pkg: Install container-selinux

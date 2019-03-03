{%- from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo
  - metalk8s.runc

Install container-selinux:
  pkg.installed:
    - name: container-selinux
    - version: {{ repo.packages['container-selinux'].version }}
    - require_in:
      - pkg: Install runc
{%- if not repo.online_mode %}
    - require:
      - pkgrepo: Configure {{ repo.packages['container-selinux'].repository }} repository
{%- endif %}

Install containerd:
  pkg.installed:
    - name: containerd
    - version: {{ repo.packages.containerd.version }}
    - fromrepo: {{ repo.packages.containerd.repository }}
    - require:
      - pkgrepo: Configure {{ repo.packages.containerd.repository }} repository
      - pkg: Install runc
      - pkg: Install container-selinux

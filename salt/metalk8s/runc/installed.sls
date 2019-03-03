{% from "metalk8s/map.jinja" import repo with context %}

include:
  - metalk8s.repo

Install criu:
  pkg.installed:
    - name: criu
    - version: {{ repo.packages.criu.version }}
    - fromrepo: {{ repo.packages.criu.repository }}
{%- if not repo.online_mode %}
    - require:
      - pkgrepo: Configure {{ repo.packages.criu.repository }} repository
{%- endif %}

Install runc:
  pkg.installed:
    - name: runc
    - version: {{ repo.packages.runc.version }}
    - fromrepo: {{ repo.packages.runc.repository }}
{%- if not repo.online_mode %}
    - require:
      - pkgrepo: Configure {{ repo.packages.runc.repository }} repository
{%- endif %}

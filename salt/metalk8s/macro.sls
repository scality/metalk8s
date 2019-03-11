{%- from "metalk8s/map.jinja" import repo with context %}

{%- macro pkg_installed(name='', pkgs=[]) -%}
  {%- set package = repo.packages[name] | default({}) %}
  pkg.installed:
  {%- if pkgs %}
    - pkgs: {{ pkgs }}
  {% else %}
    - name: {{ name }}
  {% endif %}
  {%- if not repo.online_mode %}
    - fromrepo: {{ repo.repositories.keys() | join(',') }}
    {%- if package.version | default(None) %}
    - version: {{ package.version }}
    - hold: True
    - update_holds: True
    {%- endif %}
  {%- endif %}
{%- endmacro -%}

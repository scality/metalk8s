{%- from "metalk8s/map.jinja" import repo with context %}

{%- macro pkg_installed(name='') -%}
  {%- set package = repo.packages[name] | default({}) %}
  metalk8s_package_manager.installed:
    - name: {{ name }}
    - fromrepo: {{ repo.repositories.keys() | join(',') }}
    {%- if package.version | default(None) %}
    - version: {{ package.version }}
    - hold: True
    - update_holds: True
    {%- endif %}
    - reload_modules: True
{%- endmacro -%}

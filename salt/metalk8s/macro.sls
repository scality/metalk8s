{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/map.jinja" import packages with context %}

{%- macro pkg_installed(name='') -%}
  {%- set package_name = packages.get(name, name) %}
  {%- set package = repo.packages.get(package_name, {}) %}
  metalk8s_package_manager.installed:
    - name: {{ package_name }}
    - pkgs_info: {{ repo.packages | tojson }}
    {%- if package.version | default(None) %}
    - version: {{ package.version }}
    - hold: True
    - update_holds: True
    - ignore_epoch: True
    {%- endif %}
    - reload_modules: True
    {%- if grains['os_family'].lower() == 'debian' %}
    - refresh: True
    {%- endif %}
{%- endmacro -%}

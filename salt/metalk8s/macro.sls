{%- from "metalk8s/map.jinja" import repo with context %}

{%- macro pkg_installed(name='') -%}
  {%- set package = repo.packages.get(name, {}) %}
  {%- if package %}
  metalk8s_package_manager.installed:
    - name: {{ name }}
    - fromrepo: {{ repo.repositories.keys() | join(',') }}
    - pkgs_info: {{ repo.packages }}
    {%- if package.version | default(None) %}
    - version: {{ package.version }}
    - hold: True
    - update_holds: True
    - ignore_epoch: True
    {%- endif %}
    - reload_modules: True
  {%- else %}
  {{ raise('Missing information for package "' ~ name ~ '"') }}
  {%- endif %}
{%- endmacro -%}

{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/map.jinja" import packages with context %}
{%- from "metalk8s/map.jinja" import package_exclude_list with context %}

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
    {%- if package_exclude_list %}
    - setopt:
        - exclude={{ package_exclude_list | join(',') }}
    {%- endif %}
{%- endmacro -%}

{# Returns the SKI of an existing CA cert (or "hash" if absent), to pin
   `subjectKeyIdentifier` on `x509.certificate_managed` and avoid
   regenerating the cert with a new SKI — which would invalidate every leaf
   cert's AKI (m2crypto and cryptography compute the SKI differently from
   the same pubkey, so the silent x509 → x509_v2 flip in Salt 3006 changes
   the value). #}
{%- macro preserved_ski(cert_path) -%}
  {%- set _ski = None %}
  {%- if salt['file.file_exists'](cert_path) %}
    {%- set _ski = salt['x509.read_certificate'](cert_path).get('extensions', {}).get('subjectKeyIdentifier', {}).get('value') %}
  {%- endif -%}
  {{- _ski or 'hash' -}}
{%- endmacro -%}

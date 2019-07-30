{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{%- set repo_endpoint = metalk8s.endpoints.repositories %}
{%- set repo_prefix = repo_endpoint.ip ~ ':' ~ repo_endpoint.ports.http %}
{%- set metalk8s_repository = repo_prefix ~ '/' ~ saltenv %}

{%- macro build_image_name(name='') -%}
    {%- set image_info = repo.images.get(name, {}) -%}
    {%- if image_info -%}
        {%- set image_tag = name ~ ':' ~ image_info.version -%}
{{ metalk8s_repository }}/{{ image_tag }}
    {%- else -%}
{{ raise('Missing version information about image "' ~ name ~ '"') }}
    {%- endif -%}
{%- endmacro -%}

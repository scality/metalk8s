{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{%- set repo_prefix = repo.registry_endpoint %}
{%- set metalk8s_repository = repo_prefix ~ '/' ~ saltenv %}

{%- macro build_image_name(name='', include_tag=True, include_registry=True) -%}
    {%- set prefix = metalk8s_repository if include_registry else saltenv %}
    {%- if include_tag -%}
        {%- set image_info = repo.images.get(name, {}) -%}
        {%- if image_info -%}
            {%- set image_tag = name ~ ':' ~ image_info.version -%}
{{ prefix }}/{{ image_tag }}
        {%- else -%}
{{ raise('Missing version information about image "' ~ name ~ '"') }}
        {%- endif -%}
    {%- else -%}
{{ prefix }}/{{ name }}
    {%- endif -%}
{%- endmacro -%}


{#- Same reference as `build_image_name`, but on the address of a registry
    endpoint, the first one unless given. The registry name `build_image_name`
    uses is only known to containerd, through its mirror configuration, so
    any other client needs this one. #}
{%- macro build_registry_image_name(name, endpoint=None) -%}
    {%- if endpoint is none -%}
        {%- set endpoints = metalk8s.endpoints.repositories -%}
        {%- if not endpoints | is_list -%}
            {%- set endpoints = [endpoints] -%}
        {%- endif -%}
        {%- set endpoint = endpoints | first | default({}, true) -%}
    {%- endif -%}
    {%- if not endpoint.get('ip') or not endpoint.get('ports', {}).get('http') -%}
{{ raise('Missing address of the repositories endpoint') }}
    {%- endif -%}
{{ endpoint.ip }}:{{ endpoint.ports.http }}/{{
    build_image_name(name, include_registry=False) }}
{%- endmacro -%}

{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{#- Nodes refer to an image by its upstream name, registry host included:
    containerd resolves every registry through the cluster registry mirror,
    which serves the images of the ISO under that name. #}
{%- macro build_image_name(name='') -%}
    {%- set image_info = repo.images.get(name, {}) -%}
    {%- if not image_info -%}
{{ raise('Missing version information about image "' ~ name ~ '"') }}
    {%- endif -%}
{{ image_info.image }}:{{ image_info.version }}
{%- endmacro -%}


{#- Same reference as `build_image_name`, but on the address of a registry
    endpoint, the first one unless given, for the clients that do not go
    through the containerd mirror configuration. #}
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
{{ endpoint.ip }}:{{ endpoint.ports.http }}/{{ build_image_name(name) }}
{%- endmacro -%}

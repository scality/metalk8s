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

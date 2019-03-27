{%- from "metalk8s/map.jinja" import kubernetes with context %}

{# FIXME: this won't work except on bootstrap node #}
{%- set registry_host = "localhost:5000" %}

{%- macro build_image_name(name='', tag='') -%}
"{{ registry_host }}/{{ saltenv }}/{{ name }}:{{ tag }}"
{%- endmacro -%}

{%- macro kubernetes_image(component) -%}
{{ build_image_name(component, kubernetes.version) }}
{%- endmacro -%}

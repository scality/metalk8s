{%- from "metalk8s/map.jinja" import kubernetes with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}

{%- macro build_image_name(name='', tag='', include_port=False) -%}
{%- if include_port -%}
"{{ metalk8s.endpoints.registry.ip }}:{{ metalk8s.endpoints.registry.ports.registry }}/{{ saltenv }}/{{ name }}:{{ tag }}"
{%- else -%}
"{{ metalk8s.endpoints.registry.ip }}/{{ saltenv }}/{{ name }}:{{ tag }}"
{%- endif -%}
{%- endmacro -%}

{%- macro kubernetes_image(component) -%}
{{ build_image_name(component, kubernetes.version) }}
{%- endmacro -%}

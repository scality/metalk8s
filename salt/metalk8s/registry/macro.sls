{%- from "metalk8s/map.jinja" import kubernetes with context %}
{%- from "metalk8s/map.jinja" import defaults with context %}

{%- macro build_image_name(name='', tag='', include_port=False) -%}
{%- if include_port -%}
"{{ defaults.registry_ip }}:5000/{{ saltenv }}/{{ name }}:{{ tag }}"
{%- else -%}
"{{ defaults.registry_ip }}/{{ saltenv }}/{{ name }}:{{ tag }}"
{%- endif -%}
{%- endmacro -%}

{%- macro kubernetes_image(component) -%}
{{ build_image_name(component, kubernetes.version) }}
{%- endmacro -%}

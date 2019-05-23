{%- from "metalk8s/map.jinja" import kubernetes with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}

{%- macro build_image_name(name='', tag='') -%}
"{{ metalk8s.endpoints['repositories'].ip }}:{{ metalk8s.endpoints['repositories'].ports.http }}/{{ saltenv }}/{{ name }}:{{ tag }}"
{%- endmacro -%}

{%- macro kubernetes_image(component) -%}
{{ build_image_name(component, kubernetes.version) }}
{%- endmacro -%}

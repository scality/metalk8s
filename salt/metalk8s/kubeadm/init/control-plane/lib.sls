# Share macro for building image names for each control-plane component
{%- set registry_host = "localhost:5000" -%}
{%- set kubernetes_version = "1.13.5" -%}

{%- macro get_image_name(component) -%}
"{{ registry_host }}/{{ saltenv }}/{{ component }}:{{ kubernetes_version }}"
{%- endmacro -%}

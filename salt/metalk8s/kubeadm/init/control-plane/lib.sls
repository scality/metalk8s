# Share macro for building image names for each control-plane component
{% set repository = "localhost:5000/metalk8s-2.0" %}
{% set kubernetes_version = "1.11.7" %}

{% macro get_image_name(component) -%}
"{{ repository }}/{{ component }}:{{ kubernetes_version }}"
{%- endmacro %}
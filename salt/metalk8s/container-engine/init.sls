{%- from "metalk8s/map.jinja" import kubelet with context %}

{%- if kubelet.container_engine %}

include:
  - .{{ kubelet.container_engine }}

{%- else %}

No container engine to configure:
  test.succeed_without_changes

{%- endif %}

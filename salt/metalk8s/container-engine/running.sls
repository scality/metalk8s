{%- from "metalk8s/map.jinja" import kubelet with context %}

{%- if kubelet.container_engine %}

# NOTE: This state just ensure that the container engine is running and ready

include:
  - .{{ kubelet.container_engine }}.running

Container engine is ready:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.container-engine.{{ kubelet.container_engine }}.running

{%- else %}

No container engine to check:
  test.succeed_without_changes

{%- endif %}

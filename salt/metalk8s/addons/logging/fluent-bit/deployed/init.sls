{%- if pillar.addons["fluent-bit"].enabled %}

include:
  - .configmap
  - .service-configuration
  - .chart

{%- else %}

{#- NOTE: We do not delete the CSC configuration as we do not
    want to lose the configuration if the user re-enables the
    addon. #}

Ensure fluent-bit objects does not exist:
  salt.runner:
    - name: state.orchestrate
    - pillar:
        _metalk8s_kubernetes_renderer:
          force_absent: True
    - mods:
      - metalk8s.addons.logging.fluent-bit.deployed.chart

Ensure fluent-bit config does not exist:
  metalk8s_kubernetes.object_absent:
    - name: fluent-bit
    - namespace: metalk8s-logging
    - kind: ConfigMap
    - apiVersion: v1
    - require:
      - salt: Ensure fluent-bit objects does not exist

{%- endif %}

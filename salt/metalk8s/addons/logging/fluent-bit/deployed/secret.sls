include:
  - ...deployed.namespace

{%- set fluent_bit_certs = salt.metalk8s_kubernetes.get_object(
        kind='Secret',
        apiVersion='v1',
        namespace='metalk8s-logging',
        name='fluent-bit-certs',
    )
%}

{%- if fluent_bit_certs is none %}

Create metalk8s-fluent-bit-certs Secret:
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: Secret
        metadata:
          name: fluent-bit-certs
          namespace: metalk8s-logging

{%- else %}

fluent-bit-certs Secret already exists:
  test.succeed_without_changes: []

{%- endif %}

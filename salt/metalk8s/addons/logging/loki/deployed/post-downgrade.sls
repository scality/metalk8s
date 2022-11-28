{%- set dest_version = pillar.metalk8s.cluster_version %}

{#- Some objects has been added with the new Loki chart,
    so let's cleanup those not needed in target version
    NOTE: This logic can be removed in `development/126.0` #}

{%- if salt.pkg.version_cmp(dest_version, '124.1.0') == -1 %}

Cleanup the new Loki memberlist dedicated Service:
    metalk8s_kubernetes.object_absent:
        - apiVersion: v1
        - kind: Service
        - name: loki-memberlist
        - namespace: metalk8s-logging

{%- endif %}

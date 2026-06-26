{%- set destination_version = pillar.orchestrate.destination_version %}

Patch kube-system namespace cluster-version annotation:
  metalk8s_kubernetes.object_updated:
    - name: kube-system
    - kind: Namespace
    - apiVersion: v1
    - patch:
        metadata:
          annotations:
            metalk8s.scality.com/cluster-version: {{ destination_version }}

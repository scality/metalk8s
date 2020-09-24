{%- from "metalk8s/map.jinja" import kubelet with context %}

{%- set node_name = pillar.bootstrap_id %}
{%- set cri_socket = kubelet.service.options['container-runtime-endpoint'] %}

Ensure node {{ node_name }} exists:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:metalk8s_kubernetes.object_exists(
                  kind="Node", apiVersion="v1", name="{{ node_name }}")
    # Retry as kubelet may take time to register
    - retry:
        attempts: 5

Mark node {{ node_name }} as bootstrap:
  metalk8s_kubernetes.object_updated:
    - name: salt://{{ slspath }}/files/bootstrap_node_update.yaml.j2
    - defaults:
        node_name: {{ node_name }}
        cri_socket: {{ cri_socket }}
    - require:
      - test: Ensure node {{ node_name }} exists

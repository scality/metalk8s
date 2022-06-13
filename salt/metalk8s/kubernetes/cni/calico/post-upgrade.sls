# The calico-cni-plugin package get removed in 123.0
# This state can be removed in `development/124.0`

Ensure calico-cni-plugin is removed:
  pkg.removed:
    - name: calico-cni-plugin

Restart calico-node:
  module.run:
    - cri.stop_pod:
      - labels:
          k8s-app: calico-node
    - onchanges:
      - pkg: Ensure calico-cni-plugin is removed

Make sure calico-node is up and ready:
  test.configurable_test_state:
    - changes: False
    - result: __slot__:salt:cri.wait_container(name="calico-node", state="running")
    - require:
      - module: Restart calico-node

include:
  - metalk8s.node.grains
  - metalk8s.kubernetes.kubelet
  - metalk8s.kubernetes.apiserver-proxy
  - metalk8s.internal.preflight
  - metalk8s.beacon.certificates
  - metalk8s.image-cache
  - metalk8s.image-cache.pulled

# NOTE: The node must hold its own images before the kubelet needs them, so
# that a registry going away later cannot keep a sandbox or a static Pod from
# starting again. The ordering lives here: `require_in` only resolves against
# a state in the same run, and this SLS is what brings both formulas together.
#
# Not the ID of the gate in `roles/bootstrap/local.sls`: the bootstrap
# highstate applies both role SLS, and Salt refuses an ID declared twice.
Ensure the image cache is pulled before the kubelet starts:
  test.succeed_without_changes:
    # NOTE: One state, declared by both branches of the SLS, and not the SLS
    # whole: it names exactly what the kubelet waits for.
    - require:
      - test: The worker boot cache is in place
    - require_in:
      - service: Ensure kubelet running

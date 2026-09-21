include:
  - metalk8s.node.grains
  - metalk8s.kubernetes.kubelet
  - metalk8s.kubernetes.apiserver-proxy
  - metalk8s.internal.preflight
  - metalk8s.beacon.certificates
  - metalk8s.image-cache
  - metalk8s.image-cache.pulled

# NOTE: The registry does answer here, unlike at bootstrap, so this is not
# about being able to pull at all. It is about the node holding its own
# images before it needs them: once the kubelet runs, a registry that goes
# away, or an image the kubelet garbage collects, must not be able to keep a
# sandbox or a static pod from coming back.
#
# The ordering lives here rather than in the image cache formula: `require_in`
# only resolves against a state in the same run, and this SLS is what brings
# the two formulas together.
# NOTE: A different ID from the gate `roles/bootstrap/local.sls` declares. The
# bootstrap node holds `bootstrap` and `master`, so its highstate applies both
# SLS, and Salt demands globally unique IDs across a run.
Ensure the image cache is pulled before the kubelet starts:
  test.succeed_without_changes:
    # NOTE: One state and not the SLS whole. Requiring the SLS would make the
    # kubelet wait on its failure branch too, and that branch fires when the
    # nodes pillar is unreadable, which says nothing about the archives this
    # node holds. A highstate would then no longer restart a kubelet that is
    # down on a cluster whose apiserver is unreachable.
    - require:
      - test: The boot cache this node needs is in place
    - require_in:
      - service: Ensure kubelet running

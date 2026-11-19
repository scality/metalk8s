include:
  - metalk8s.kubernetes.ca.kubernetes.installed
  - metalk8s.roles.bootstrap.local
  - metalk8s.roles.minion
  - metalk8s.image-cache.provisioned

# NOTE: Nothing pulls container images before the kubelet does, and this node
# has no registry to pull from, so its cache has to be filled and imported
# first. The ordering lives here rather than in the image cache formula:
# `require_in` only resolves against a state in the same run, and this SLS is
# what brings the two formulas together.
#
# Here and not in a role SLS: `bootstrap.sh` and `restore.sh` apply this SLS
# before the kubelet ever starts, and the highstate must not run any image
# cache command, since the image cache agent stages each new version.
Ensure the image cache is filled before the kubelet starts:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.image-cache.provisioned
    - require_in:
      - service: Ensure kubelet running

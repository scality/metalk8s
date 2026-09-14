include:
  - metalk8s.archives.mounted
  - metalk8s.kubernetes.kubelet.standalone
  - metalk8s.internal.preflight
  - metalk8s.repo.installed
  - metalk8s.salt.master.certs.salt-api
  - metalk8s.salt.master.installed
  - metalk8s.kubectl
  - metalk8s.image-cache.provisioned

# NOTE: Nothing pulls container images before the kubelet does, and this node
# has no registry to pull from, so its cache has to be filled and imported
# first. The ordering lives here rather than in the image cache formula:
# `require_in` only resolves against a state in the same run, and this SLS is
# what brings the two formulas together.
#
# Here and not in `init.sls`, because this is the run that starts the kubelet
# for the first time: `bootstrap.sh` applies
# `metalk8s.roles.internal.early-stage-bootstrap`, which reaches this SLS and
# `metalk8s.kubernetes.kubelet.standalone` long before the highstate. Since
# `init.sls` includes this SLS, the highstate is covered too.
Ensure the image cache is filled before the kubelet starts:
  test.succeed_without_changes:
    - require:
      - sls: metalk8s.image-cache.provisioned
    - require_in:
      - service: Ensure kubelet running

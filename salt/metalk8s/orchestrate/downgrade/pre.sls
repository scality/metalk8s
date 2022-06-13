# Include here all states that should be called before downgrading
# NOTE: This state should be called by salt-master using the saltenv of
# the current version (salt-master should not have been downgraded yet)

{%- set dest_version = pillar.metalk8s.cluster_version %}

{%- if salt.pkg.version_cmp(dest_version, '123.0.0') == -1 %}

# The calico-cni-plugin package get removed in 123.0
# in order to work properly we need to downgrade calico at the very begining
# This logic can be removed in `development/124.0`

Downgrade calico:
  salt.runner:
    - name: state.orchestrate
    - mods:
      - metalk8s.kubernetes.cni.calico.deployed
    - saltenv: metalk8s-{{ dest_version }}

Install calico-cni-plugin on every nodes:
  salt.state:
    - tgt: '*'
    - sls:
      - metalk8s.kubernetes.cni.calico
    - saltenv: metalk8s-{{ dest_version }}
    - require:
      - salt: Downgrade calico

{%- else %}

Nothing to do before downgrading:
  test.nop: []

{%- endif %}

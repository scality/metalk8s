{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include :
  - .dependencies
  - .running

# Make sure `python36-psutil` is installed on every minions as it's used
# in some MetalK8s custom execution modules
Install python psutil:
  {{ pkg_installed('python36-psutil') }}:
    - require:
      - test: Repositories configured

Install salt-minion:
  {{ pkg_installed('salt-minion') }}
    # NOTE: launch `salt-minion` installation/upgrade/downgrade at the
    # end as this may have impact on the running salt states
    - order: last
    - require:
      - test: Repositories configured
    - require_in:
      - cmd: Restart salt-minion

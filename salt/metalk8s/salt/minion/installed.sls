{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include :
  - metalk8s.repo
  - .running

Install salt-minion:
  {{ pkg_installed('salt-minion') }}
    # NOTE: launch `salt-minion` installation/upgrade/downgrade at the
    # end as this may have impact on the running salt states
    - order: last
    - require:
      - test: Repositories configured
    - require_in:
      - cmd: Restart salt-minion

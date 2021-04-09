{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include :
  - .dependencies
  - .restart

Install salt-minion:
  {{ pkg_installed('salt-minion') }}
    # NOTE: launch `salt-minion` installation/upgrade/downgrade at the
    # end as this may have impact on the running salt states
    - order: last
    - require:
      - test: Repositories configured
    - watch_in:
      - cmd: Restart salt-minion

Enable Salt minion:
  service.enabled:
    - name: salt-minion
    - require:
      - metalk8s_package_manager: Install salt-minion

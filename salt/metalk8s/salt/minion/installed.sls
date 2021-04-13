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

Start and enable Salt minion:
  # NOTE: We use `service.running` but do not put any `watch` as
  # we do not want this state to restart salt-minion process just
  # start it if not yet started and enable the service
  service.running:
    - name: salt-minion
    - enable: True
    - require:
      - metalk8s_package_manager: Install salt-minion
    - require_in:
      - cmd: Restart salt-minion

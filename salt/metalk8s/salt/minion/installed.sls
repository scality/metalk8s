{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include :
  - .dependencies
  - .restart

# Make sure `genisoimage` is installed on every minions as it's used
# in some MetalK8s custom execution modules
Install genisoimage:
  {{ pkg_installed('genisoimage') }}:
    - require:
      - test: Repositories configured

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
    - watch_in:
      - cmd: Restart salt-minion

Start and enable Salt minion:
  # NOTE: We use `service.running` but do not put any `watch` as
  # we do not want this state to restart salt-minion process just
  # start it if not yet started and enable the service
  service.running:
    - order: last
    - name: salt-minion
    - enable: True
    - require:
      - metalk8s_package_manager: Install salt-minion
    - require_in:
      - cmd: Restart salt-minion

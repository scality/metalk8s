# Salt need `python36-rpm` to do proper version comparaison and since we
# use salt-ssh to install salt the first time, we want this rpm to be installed
# before Salt-minion as salt-minion installation state will report a "failure"
# because of version comparaison

# See: https://github.com/saltstack/salt/issues/58039
#      https://github.com/saltstack/salt/issues/57972

{%- from "metalk8s/macro.sls" import pkg_installed with context %}

include:
  - metalk8s.repo

Install python36-rpm:
  {{ pkg_installed('python36-rpm') }}
    - require:
      - test: Repositories configured

{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import repo with context %}

{%- set salt_minion_version = repo.packages.get('salt-minion', {}).get('version') %}
{%- set installed_version = salt['pkg.version']('salt-minion') %}

include:
  - metalk8s.repo
  - .restart

# Make sure `genisoimage` is installed on every minions as it's used
# in some MetalK8s custom execution modules
Install genisoimage:
  {{ pkg_installed('genisoimage') }}:
    - require:
      - test: Repositories configured

# Only install salt-minion if missing, never change its version from here:
# upgrading/downgrading it from within a salt job gets the job killed by the
# RPM scriptlets (the %pre stops the minion and the unit cleanup SIGKILLs the
# whole cgroup, see saltstack/salt#69656). Version changes are handled by the
# detached upgrade below.
Install salt-minion:
  pkg.installed:
    - name: salt-minion
    {%- if not installed_version %}
    - version: {{ salt_minion_version }}
    {%- endif %}
    - hold: True
    - update_holds: True
    - ignore_epoch: True
    - require:
      - test: Repositories configured

# Change the salt-minion version (dnf install with an explicit version also
# downgrades) against an idle minion, detached from this state run: the sleep
# leaves time for this job to complete and return before the RPM %pre stops
# the minion, and the %posttrans (salt >= 3006.27) restarts it. The
# orchestration waits for the new version (see `deploy_node`).
# The transaction bypasses the versionlock (which still pins the previous
# version) and refreshes it once done.
# On fresh installs the `unless`, evaluated after `Install salt-minion`,
# makes this a no-op.
Launch detached salt-minion upgrade:
  cmd.run:
    - name: >-
        systemd-run --unit metalk8s-salt-minion-upgrade --collect --
        sh -c 'sleep 5
        && dnf install -y --disableplugin=versionlock
        salt-{{ salt_minion_version }} salt-minion-{{ salt_minion_version }}
        || exit 1;
        dnf versionlock delete salt-minion;
        dnf versionlock add salt-minion'
    - unless: rpm -q salt-minion-{{ salt_minion_version }}
    - order: last
    - require:
      - pkg: Install salt-minion
    # Explicit ordering so the restart's `unless` can see the upgrade unit
    - require_in:
      - cmd: Restart salt-minion

Start and enable Salt minion:
  # NOTE: We use `service.running` but do not put any `watch` as
  # we do not want this state to restart salt-minion process just
  # start it if not yet started and enable the service
  service.running:
    - name: salt-minion
    - enable: True
    - require:
      - pkg: Install salt-minion

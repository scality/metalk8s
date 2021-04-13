{%- from "metalk8s/macro.sls" import pkg_installed with context %}
{%- from "metalk8s/map.jinja" import certificates with context %}

include:
  - metalk8s.repo

Install Python3 OpenSSL:
  {{ pkg_installed('python36-pyOpenSSL') }}
    - require:
      - test: Repositories configured

{%- set certs = [] %}
{%- for cert_type in ['client', 'server'] %}
  {%- for cert in certificates[cert_type].files.values() %}
    {%- if cert.watched %}
      {%- do certs.append(cert.path) %}
    {%- endif %}
  {%- endfor %}
{%- endfor %}
{%- if certs %}
Add beacon for certificates expiration:
  beacon.present:
    - name: metalk8s_watch_certificates_expiry
    - beacon_module: cert_info
    - interval: {{ certificates.beacon.interval }}
    - run_once: {{ certificates.beacon.run_once }}
    - disable_during_state_run: True
    - notify_days: {{ certificates.beacon.notify_days }}
    - files: {{ certs | json }}
    - require_in:
      - file: Write beacons configuration
{%- endif %}

{%- set kubeconfigs = [] %}
{%- for kubeconfig in certificates.kubeconfig.files.values() %}
  {%- if kubeconfig.watched %}
    {%- do kubeconfigs.append(kubeconfig.path) %}
  {%- endif %}
{%- endfor %}
{%- if kubeconfigs %}
Add beacon for kubeconfig expiration:
  beacon.present:
    - name: metalk8s_watch_kubeconfig_expiry
    - beacon_module: metalk8s_kubeconfig_info
    - interval: {{ certificates.beacon.interval }}
    - run_once: {{ certificates.beacon.run_once }}
    - disable_during_state_run: True
    - notify_days: {{ certificates.beacon.notify_days }}
    - files: {{ kubeconfigs | json }}
    - require_in:
      - file: Write beacons configuration
{%- endif %}

{%- if certs or kubeconfigs %}
{# We should use `- save: True` in the `beacon.present` states above,
   instead of writing the configuration file with a `file.managed`,
   but for now it's bugged, so we use this workaround.
   The bug should be fixed in Salt 3003 and this commit can then be reverted.
   See:
     - https://github.com/saltstack/salt/issues/58006
     - https://github.com/saltstack/salt/issues/58579
     - https://github.com/saltstack/salt/issues/59075
     - https://github.com/saltstack/salt/pull/58854
#}
Write beacons configuration:
  file.managed:
    - name: /etc/salt/minion.d/beacons.conf
    - contents: __slot__:salt:beacons.list()
{%- else %}
No certificate or kubeconfig to watch for this node:
  test.nop
{%- endif %}

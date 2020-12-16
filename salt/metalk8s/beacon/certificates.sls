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
    - save: True
    - beacon_module: cert_info
    - interval: {{ certificates.beacon.interval }}
    - disable_during_state_run: True
    - notify_days: {{ certificates.beacon.notify_days }}
    - files: {{ certs | json }}
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
    - save: True
    - beacon_module: metalk8s_kubeconfig_info
    - interval: {{ certificates.beacon.interval }}
    - disable_during_state_run: True
    - notify_days: {{ certificates.beacon.notify_days }}
    - files: {{ kubeconfigs | json }}
{%- endif %}

{%- if not certs and not kubeconfigs %}
No certificate or kubeconfig to watch for this node:
  test.nop
{%- endif %}

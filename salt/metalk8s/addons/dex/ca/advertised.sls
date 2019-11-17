{%- set dex_ca_b64_server = salt['mine.get'](
    pillar.metalk8s.ca.minion, 'dex_ca_b64'
) %}

{%- if dex_ca_b64_server %}

{%- set dex_cert_b64 = dex_ca_b64_server[pillar.metalk8s.ca.minion] %}
{%- set dex_ca_cert = salt['hashutil.base64_b64decode'](dex_cert_b64) %}

Ensure Dex CA cert is present:
  file.managed:
    - name: /etc/metalk8s/pki/dex/ca.crt
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - contents: {{ dex_ca_cert.splitlines() }}

{%- else %}

Unable to get Dex CA cert, no kubernetes_dex_ca_b64 in mine:
  test.fail_without_changes: []

{%- endif %}

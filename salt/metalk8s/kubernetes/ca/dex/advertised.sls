{%- set dex_ca_b64_server = salt['mine.get'](pillar['metalk8s']['ca']['minion'], 'kubernetes_dex_ca_b64') %}

{%- if dex_ca_b64_server %}

{%- set dex_cert_b64 = dex_ca_b64_server[pillar['metalk8s']['ca']['minion']] %}
{%- set dex_ca_cert = salt['hashutil.base64_b64decode'](dex_cert_b64) %}

Ensure dex CA cert is present:
  file.managed:
    - name: /etc/kubernetes/pki/dex-ca.crt
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - contents: {{ dex_ca_cert.splitlines() }}

{%- else %}

Unable to get dex CA cert, no kubernetes_dex_ca_b64 in mine:
  test.fail_without_changes: []

{%- endif %}

{%- set dex_server_cert_b64 = salt['mine.get'](pillar['metalk8s']['ca']['minion'], 'kubernetes_dex_server_cert_b64') %}

{%- if dex_server_cert_b64 %}

{%- set dex_server_b64 = dex_server_cert_b64[pillar['metalk8s']['ca']['minion']] %}
{%- set dex_server_cert = salt['hashutil.base64_b64decode'](dex_server_b64) %}

Ensure dex server cert is present:
  file.managed:
    - name: /etc/kubernetes/pki/dex-server.crt
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - contents: {{ dex_server_cert.splitlines() }}

{%- else %}

Unable to get dex server cert, no kubernetes_dex_server_cert_b64 in mine:
  test.fail_without_changes: []

{%- endif %}
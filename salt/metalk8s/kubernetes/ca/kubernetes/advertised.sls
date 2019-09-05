{%- set root_ca_b64_request = salt['mine.get'](pillar['metalk8s']['ca']['minion'], 'kubernetes_root_ca_b64') %}

{%- if root_ca_b64_request %}

{%- set ca_cert_b64 = root_ca_b64_request[pillar['metalk8s']['ca']['minion']] %}
{%- set ca_cert = salt['hashutil.base64_b64decode'](ca_cert_b64) %}

Ensure kubernetes CA cert is present:
  file.managed:
    - name: /etc/kubernetes/pki/ca.crt
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - contents: {{ ca_cert.splitlines() }}

{%- else %}

Unable to get kubernetes CA cert, no kubernetes_root_ca_b64 in mine:
  test.fail_without_changes: []

{%- endif %}

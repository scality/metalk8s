{%- set ca_server = salt['mine.get'](pillar['metalk8s']['ca']['minion'], 'kubernetes_ca_server') %}

{%- if ca_server %}

{%- set ca_cert_b64 = ca_server[pillar['metalk8s']['ca']['minion']] %}
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

Unable to get kubernetes CA cert, no kubernetes_ca_server in mine:
  test.fail_without_changes: []

{%- endif %}

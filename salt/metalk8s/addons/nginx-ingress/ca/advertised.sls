{%- set ingress_ca_b64_server = salt['mine.get'](
    pillar.metalk8s.ca.minion, 'ingress_ca_b64'
) %}

{%- if ingress_ca_b64_server %}

{%- set ingress_cert_b64 = ingress_ca_b64_server[pillar.metalk8s.ca.minion] %}
{%- set ingress_ca_cert = salt['hashutil.base64_b64decode'](ingress_cert_b64) %}

Ensure Ingress CA cert is present:
  file.managed:
    - name: /etc/metalk8s/pki/nginx-ingress/ca.crt
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - contents: {{ ingress_ca_cert.splitlines() }}

{%- else %}

Unable to get Ingress CA cert, no ingress_ca_b64 in mine:
  test.fail_without_changes: []

{%- endif %}

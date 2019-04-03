{%- set front_proxy_ca_server = salt['mine.get']('*', 'kubernetes_front_proxy_ca_b64') %}

{%- if front_proxy_ca_server %}

{%- set ca_cert_b64 = front_proxy_ca_server.values()[0] %}
{%- set ca_cert = salt['hashutil.base64_b64decode'](ca_cert_b64) %}

Ensure front-proxy CA cert is present:
  file.managed:
    - name: /etc/kubernetes/pki/front-proxy-ca.crt
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - contents: {{ ca_cert.splitlines() }}

{%- endif %}

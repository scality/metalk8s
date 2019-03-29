{%- from "metalk8s/map.jinja" import front_proxy with context %}

{%- set front_proxy_ca_server = salt['mine.get']('*', 'kubernetes_front_proxy_ca_server').keys() %}
{%- if front_proxy_ca_server %}

{%- set ca_cert = salt['mine.get']('*', 'kubernetes_front_proxy_ca_server').values()[0] %}
{%- set ca_cert_b64 = salt['hashutil.base64_b64decode'](ca_cert) %}

Ensure CA cert is present:
  file.managed:
    - name: /etc/kubernetes/pki/front-proxy-ca.crt
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - contents: {{ ca_cert_b64.splitlines() }}

include:
  - .installed

Create front proxy client private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/front-proxy-client.key
    - bits: 2048
    - verbose: False
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - pkg: Install m2crypto

Generate front proxy client certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/front-proxy-client.crt
    - public_key: /etc/kubernetes/pki/front-proxy-client.key
    - ca_server: {{ front_proxy_ca_server[0] }}
    - signing_policy: {{ front_proxy.cert.client_signing_policy }}
    - CN: front-proxy-client
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create front proxy client private key

{%- else %}

Unable to generate front proxy client certificate, no CA server available:
  test.fail_without_changes: []

{%- endif %}

{%- from "metalk8s/map.jinja" import dex with context %}

{%- set oidc_service_ip = salt.metalk8s_network.get_oidc_service_ip() %}

include:
  - metalk8s.internal.m2crypto

Create dex server private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/dex-server.key
    - bits: 4096
    - verbose: False
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - metalk8s_package_manager: Install m2crypto

Generate dex server certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/dex-server.crt
    - public_key: /etc/kubernetes/pki/dex-server.key
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ dex.cert.server_signing_policy }}
    - CN: dex-server
    - subjectAltName: "DNS:{{ grains['fqdn'] }}, DNS:localhost, IP:{{ oidc_service_ip }}, IP:127.0.0.1"
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create dex server private key

Advertise dex server certificate in the mine:
  module.wait:
    - mine.send:
      - func: kubernetes_dex_server_cert_b64
      - mine_function: hashutil.base64_encodefile
      - /etc/kubernetes/pki/dex-server.crt
    - watch:
      - x509: Generate dex server certificate

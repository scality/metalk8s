{%- from "metalk8s/map.jinja" import front_proxy with context %}

include:
  - metalk8s.internal.m2crypto

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
      - metalk8s_package_manager: Install m2crypto

Generate front proxy client certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/front-proxy-client.crt
    - public_key: /etc/kubernetes/pki/front-proxy-client.key
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ front_proxy.cert.client_signing_policy }}
    - CN: front-proxy-client
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create front proxy client private key

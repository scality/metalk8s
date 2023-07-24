{%- from "metalk8s/map.jinja" import dex with context %}

{%- set private_key_path = "/etc/metalk8s/pki/dex/ca.key" %}

include:
  - metalk8s.internal.m2crypto

Create dex CA private key:
  x509.private_key_managed:
    - name: {{ private_key_path }}
    - bits: 4096
    - verbose: False
    - user: root
    - group: root
    - mode: '0600'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - metalk8s_package_manager: Install m2crypto
    - unless:
      - test -f "{{ private_key_path }}"

Generate dex CA certificate:
  x509.certificate_managed:
    - name: /etc/metalk8s/pki/dex/ca.crt
    - signing_private_key: {{ private_key_path }}
    - CN: dex-ca
    - keyUsage: "critical digitalSignature, keyEncipherment, keyCertSign"
    - basicConstraints: "critical CA:true"
    - days_valid: {{ dex.ca.cert.days_valid }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create dex CA private key

Advertise dex CA certificate in the mine:
  module.run:
    - mine.send:
      - dex_ca_b64
      - mine_function: hashutil.base64_encodefile
      - /etc/metalk8s/pki/dex/ca.crt
    - onchanges:
      - x509: Generate dex CA certificate

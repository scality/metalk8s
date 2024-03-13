{%- from "metalk8s/map.jinja" import front_proxy with context %}

{%- set private_key_path = "/etc/kubernetes/pki/front-proxy-ca.key" %}

include:
  - metalk8s.internal.m2crypto

Create front proxy CA private key:
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

Generate front proxy CA certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/front-proxy-ca.crt
    - signing_private_key: {{ private_key_path }}
    - CN: front-proxy-ca
    - keyUsage: "critical digitalSignature, keyEncipherment, keyCertSign"
    - basicConstraints: "critical CA:true"
    - days_valid: {{ front_proxy.ca.cert.days_valid }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create front proxy CA private key

Advertise front proxy CA certificate in the mine:
  module.wait:
    - mine.send:
      - kubernetes_front_proxy_ca_b64
      - mine_function: hashutil.base64_encodefile
      - /etc/kubernetes/pki/front-proxy-ca.crt
    - watch:
      - x509: Generate front proxy CA certificate

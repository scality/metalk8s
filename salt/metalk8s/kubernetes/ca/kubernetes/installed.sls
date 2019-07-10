{%- from "metalk8s/map.jinja" import ca with context %}

include:
  - metalk8s.internal.m2crypto

Create CA private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/ca.key
    - bits: 4096
    - verbose: False
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - metalk8s_package_manager: Install m2crypto

Generate CA certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/ca.crt
    - signing_private_key: /etc/kubernetes/pki/ca.key
    - CN: kubernetes
    - keyUsage: "critical digitalSignature, keyEncipherment, keyCertSign"
    - basicConstraints: "critical CA:true"
    - days_valid: {{ ca.cert.days_valid }}
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create CA private key

Advertise CA certificate in the mine:
  module.wait:
    - mine.send:
      - func: 'kubernetes_ca_server'
      - mine_function: hashutil.base64_encodefile
      - /etc/kubernetes/pki/ca.crt
    - watch:
      - x509: Generate CA certificate

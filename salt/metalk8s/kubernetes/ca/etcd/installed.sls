{%- from "metalk8s/map.jinja" import etcd with context %}

{%- set private_key_path = "/etc/kubernetes/pki/etcd/ca.key" %}

include:
  - metalk8s.internal.m2crypto

Create etcd CA private key:
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

Generate etcd CA certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/etcd/ca.crt
    - signing_private_key: {{ private_key_path }}
    - CN: etcd-ca
    - keyUsage: "critical digitalSignature, keyEncipherment, keyCertSign"
    - basicConstraints: "critical CA:true"
    - days_valid: {{ etcd.ca.cert.days_valid }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create etcd CA private key

Advertise etcd CA certificate in the mine:
  module.run:
    - mine.send:
      - kubernetes_etcd_ca_b64
      - mine_function: hashutil.base64_encodefile
      - /etc/kubernetes/pki/etcd/ca.crt
    - onchanges:
      - x509: Generate etcd CA certificate

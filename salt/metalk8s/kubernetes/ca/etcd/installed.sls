{%- from "metalk8s/map.jinja" import etcd with context %}

include:
  - metalk8s.internal.m2crypto

Create etcd CA private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/etcd/ca.key
    - bits: 4096
    - verbose: False
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - metalk8s_package_manager: Install m2crypto

Generate etcd CA certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/etcd/ca.crt
    - signing_private_key: /etc/kubernetes/pki/etcd/ca.key
    - CN: etcd-ca
    - keyUsage: "critical digitalSignature, keyEncipherment, keyCertSign"
    - basicConstraints: "critical CA:true"
    - days_valid: {{ etcd.ca.cert.days_valid }}
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create etcd CA private key

Advertise etcd CA certificate in the mine:
  module.wait:
    - mine.send:
      - func: kubernetes_etcd_ca_b64
      - mine_function: hashutil.base64_encodefile
      - /etc/kubernetes/pki/etcd/ca.crt
    - watch:
      - x509: Generate etcd CA certificate

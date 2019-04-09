{%- from "metalk8s/map.jinja" import etcd with context %}

include:
  - metalk8s.internal.m2crypto
  - metalk8s.salt.minion.running

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
      - pkg: Install m2crypto

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

Create etcd CA salt signing policies:
  file.serialize:
    - name: /etc/salt/minion.d/30-metalk8s-etcd-ca-signing-policies.conf
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - formatter: yaml
    - dataset:
        x509_signing_policies:
          etcd_client_policy:
            - minions: '*'
            - signing_private_key: /etc/kubernetes/pki/etcd/ca.key
            - signing_cert: /etc/kubernetes/pki/etcd/ca.crt
            - keyUsage: "critical digitalSignature, keyEncipherment"
            - extendedKeyUsage: "clientAuth"
            - days_valid: {{ etcd.ca.signing_policy.days_valid }}
          etcd_server_client_policy:
            - minions: '*'
            - signing_private_key: /etc/kubernetes/pki/etcd/ca.key
            - signing_cert: /etc/kubernetes/pki/etcd/ca.crt
            - keyUsage: "critical digitalSignature, keyEncipherment"
            - extendedKeyUsage: "serverAuth, clientAuth"
            - days_valid: {{ etcd.ca.signing_policy.days_valid }}
    - watch_in:
      - cmd: Restart salt-minion

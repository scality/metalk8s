{%- from "metalk8s/map.jinja" import etcd with context %}

include:
  - metalk8s.internal.m2crypto

Create etcd healthcheck client private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/etcd/healthcheck-client.key
    - bits: 2048
    - verbose: False
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - metalk8s_package_manager: Install m2crypto

Generate etcd healthcheck client certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/etcd/healthcheck-client.crt
    - public_key: /etc/kubernetes/pki/etcd/healthcheck-client.key
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ etcd.cert.healthcheck_client_signing_policy }}
    - CN: kube-etcd-healthcheck-client
    - O: "system:masters"
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create etcd healthcheck client private key

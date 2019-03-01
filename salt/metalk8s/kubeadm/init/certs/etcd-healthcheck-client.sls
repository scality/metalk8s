{%- from "metalk8s/map.jinja" import etcd with context %}

{%- set etcd_ca_server = salt['mine.get']('*', 'kubernetes_etcd_ca_server').keys() %}
{%- if etcd_ca_server %}

include:
  - .installed

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
      - pkg: Install m2crypto

Generate etcd healthcheck client certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/etcd/healthcheck-client.crt
    - public_key: /etc/kubernetes/pki/etcd/healthcheck-client.key
    - ca_server: {{ etcd_ca_server[0] }}
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

{%- else %}

Unable to generate etcd healthcheck client certificate, no CA server available:
  test.fail_without_changes: []

{%- endif %}

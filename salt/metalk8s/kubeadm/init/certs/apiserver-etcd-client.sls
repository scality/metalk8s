{%- from "metalk8s/map.jinja" import etcd with context %}

{%- set etcd_ca_server = salt['mine.get']('*', 'kubernetes_etcd_ca_server').keys() %}
{%- if etcd_ca_server %}

include:
  - .installed

Create apiserver etcd client private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/apiserver-etcd-client.key
    - bits: 2048
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - pkg: Install m2crypto

Generate apiserver etcd client certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/apiserver-etcd-client.crt
    - public_key: /etc/kubernetes/pki/apiserver-etcd-client.key
    - ca_server: {{ etcd_ca_server[0] }}
    - signing_policy: {{ etcd.cert.apiserver_client_signing_policy }}
    - CN: kube-apiserver-etcd-client
    - O: "system:masters"
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create apiserver etcd client private key

{%- else %}

Unable to generate apiserver etcd client certificate, no CA server available:
  test.fail_without_changes: []

{%- endif %}

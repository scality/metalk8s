{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import etcd with context %}

{%- set private_key_path = "/etc/kubernetes/pki/etcd/healthcheck-client.key" %}

include:
  - metalk8s.internal.m2crypto

Create etcd healthcheck client private key:
  x509.private_key_managed:
    - name: {{ private_key_path }}
    - bits: 2048
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

Generate etcd healthcheck client certificate:
  x509.certificate_managed:
    - name: {{ certificates.client.files['etcd-healthcheck'].path }}
    - public_key: {{ private_key_path }}
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ etcd.cert.healthcheck_client_signing_policy }}
    - CN: kube-etcd-healthcheck-client
    - O: "system:masters"
    - days_valid: {{
        certificates.client.files['etcd-healthcheck'].days_valid |
        default(certificates.client.days_valid) }}
    - days_remaining: {{
        certificates.client.files['etcd-healthcheck'].days_remaining |
        default(certificates.client.days_remaining) }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create etcd healthcheck client private key

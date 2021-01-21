{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import etcd with context %}

{%- set private_key_path = "/etc/kubernetes/pki/etcd/server.key" %}

include:
  - metalk8s.internal.m2crypto

Create etcd server private key:
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

Generate etcd server certificate:
  x509.certificate_managed:
    - name: {{ certificates.server.files.etcd.path }}
    - public_key: {{ private_key_path }}
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ etcd.cert.server_signing_policy }}
    - CN: "{{ grains['fqdn'] }}"
    - subjectAltName: "DNS:{{ grains['fqdn'] }}, DNS:localhost, IP:{{ grains['metalk8s']['control_plane_ip'] }}, IP:127.0.0.1"
    - days_valid: {{
        certificates.server.files.etcd.days_valid |
        default(certificates.server.days_valid) }}
    - days_remaining: {{
        certificates.server.files.etcd.days_remaining |
        default(certificates.server.days_remaining) }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create etcd server private key

{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import coredns with context %}
{%- from "metalk8s/map.jinja" import dex with context %}

{%- set oidc_service_ip = salt.metalk8s_network.get_oidc_service_ip() %}
{%- set private_key_path = "/etc/metalk8s/pki/dex/server.key" %}

include:
  - metalk8s.internal.m2crypto

Create Dex server private key:
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

{%- set certSANs = [
    grains.fqdn,
    'localhost',
    '127.0.0.1',
    'dex',
    'dex.metalk8s-auth',
    'dex.metalk8s-auth.svc',
    'dex.metalk8s-auth.svc.{{ coredns.cluster_domain }}',
    oidc_service_ip,
    grains.metalk8s.control_plane_ip,
] %}

Generate Dex server certificate:
  x509.certificate_managed:
    - name: {{ certificates.server.files.dex.path }}
    - public_key: {{ private_key_path }}
    - ca_server: {{ pillar.metalk8s.ca.minion }}
    - signing_policy: {{ dex.cert.server_signing_policy }}
    - CN: dex-server
    - subjectAltName: "{{ salt['metalk8s.format_san'](certSANs | unique) }}"
    - days_valid: {{
        certificates.server.files.dex.days_valid |
        default(certificates.server.days_valid) }}
    - days_remaining: {{
        certificates.server.files.dex.days_remaining |
        default(certificates.server.days_remaining) }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create Dex server private key

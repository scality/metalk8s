{%- from "metalk8s/map.jinja" import dex with context %}

{%- set oidc_service_ip = salt.metalk8s_network.get_oidc_service_ip() %}

include:
  - metalk8s.internal.m2crypto

Create Dex server private key:
  x509.private_key_managed:
    - name: /etc/metalk8s/pki/dex/server.key
    - bits: 4096
    - verbose: False
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - metalk8s_package_manager: Install m2crypto

{%- set certSANs = [
    grains.fqdn,
    'localhost',
    '127.0.0.1',
    'dex',
    'dex.metalk8s-auth',
    'dex.metalk8s-auth.svc',
    'dex.metalk8s-auth.svc.cluster.local',
    oidc_service_ip,
    grains.metalk8s.control_plane_ip,
] %}

Generate Dex server certificate:
  x509.certificate_managed:
    - name: /etc/metalk8s/pki/dex/server.crt
    - public_key: /etc/metalk8s/pki/dex/server.key
    - ca_server: {{ pillar.metalk8s.ca.minion }}
    - signing_policy: {{ dex.cert.server_signing_policy }}
    - CN: dex-server
    - subjectAltName: "{{ salt['metalk8s.format_san'](certSANs | unique) }}"
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create Dex server private key

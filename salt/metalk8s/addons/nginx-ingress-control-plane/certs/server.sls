{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import nginx_ingress with context %}

{%- set private_key_path = "/etc/metalk8s/pki/nginx-ingress/control-plane-server.key" %}

include:
  - metalk8s.internal.m2crypto

Create Control-Plane Ingress server private key:
  x509.private_key_managed:
    - name: {{ private_key_path }}
    - bits: 4096
    - verbose: False
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - metalk8s_package_manager: Install m2crypto
    - unless:
      - test -f "{{ private_key_path }}"

{# TODO: add Ingress Service IP once stable (LoadBalancer probably) #}
{%- set certSANs = [
    grains.fqdn,
    'localhost',
    '127.0.0.1',
    'nginx-ingress-control-plane',
    'nginx-ingress-control-plane.metalk8s-ingress',
    'nginx-ingress-control-plane.metalk8s-ingress.svc',
    'nginx-ingress-control-plane.metalk8s-ingress.svc.cluster.local',
    grains.metalk8s.control_plane_ip,
] %}

Generate Control-Plane Ingress server certificate:
  x509.certificate_managed:
    - name: {{ certificates.server.files['control-plane-ingress'].path }}
    - public_key: {{ private_key_path }}
    - ca_server: {{ pillar.metalk8s.ca.minion }}
    - signing_policy: {{ nginx_ingress.cert.server_signing_policy }}
    - CN: nginx-ingress-control-plane-server
    - subjectAltName: "{{ salt['metalk8s.format_san'](certSANs | unique) }}"
    - days_valid: {{
        certificates.server.files['control-plane-ingress'].days_valid |
        default(certificates.server.days_valid) }}
    - days_remaining: {{
        certificates.server.files['control-plane-ingress'].days_remaining |
        default(certificates.server.days_remaining) }}
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create Control-Plane Ingress server private key

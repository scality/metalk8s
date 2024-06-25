{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import coredns with context %}
{%- from "metalk8s/map.jinja" import nginx_ingress with context %}

{%- set private_key_path = "/etc/metalk8s/pki/nginx-ingress/control-plane-server.key" %}

Create Control-Plane Ingress server private key:
  x509.private_key_managed:
    - name: {{ private_key_path }}
{%- if salt["salt_version.greater_than"]("Phosphorus") %}
    - keysize: 4096
{%- else %}
    - bits: 4096
{%- endif %}
    - user: root
    - group: root
    - mode: '0600'
    - makedirs: True
    - dir_mode: '0755'
    - unless:
      - test -f "{{ private_key_path }}"

{%- set certSANs = [
    grains.fqdn,
    'localhost',
    '127.0.0.1',
    'nginx-ingress-control-plane',
    'nginx-ingress-control-plane.metalk8s-ingress',
    'nginx-ingress-control-plane.metalk8s-ingress.svc',
    'nginx-ingress-control-plane.metalk8s-ingress.svc.' ~ coredns.cluster_domain,
] %}

{%- set cp_ingress_ip = salt.metalk8s_network.get_control_plane_ingress_ip() %}
{%- if cp_ingress_ip %}
  {%- do certSANs.append(cp_ingress_ip) %}
{%- endif %}

Generate Control-Plane Ingress server certificate:
  x509.certificate_managed:
    - name: {{ certificates.server.files['control-plane-ingress'].path }}
{%- if salt["salt_version.greater_than"]("Phosphorus") %}
    - private_key: {{ private_key_path }}
{%- else %}
    - public_key: {{ private_key_path }}
{%- endif %}
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
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create Control-Plane Ingress server private key

{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import coredns with context %}
{%- from "metalk8s/map.jinja" import kube_api with context %}

{%- set private_key_path = "/etc/salt/pki/api/salt-api.key" %}

include:
  - metalk8s.internal.m2crypto

Create Salt API private key:
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

{% set certSANs = [
    grains['fqdn'],
    'salt-master',
    'salt-master.kube-system',
    'salt-master.kube-system.svc',
    'salt-master.kube-system.svc.' ~ coredns.cluster_domain,
    grains['metalk8s']['control_plane_ip'],
]
%}

Generate Salt API certificate:
  x509.certificate_managed:
    - name: {{ certificates.server.files['salt-api'].path }}
    - public_key: {{ private_key_path }}
{%- if salt.config.get('file_client') != 'local' %}
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
{%- endif %}
    - signing_policy: {{ kube_api.cert.server_signing_policy }}
    - CN: salt-api on {{ grains.id }}
    - subjectAltName: "{{ salt['metalk8s.format_san'](certSANs | unique) }}"
    - days_valid: {{
        certificates.server.files['salt-api'].days_valid |
        default(certificates.server.days_valid) }}
    - days_remaining: {{
        certificates.server.files['salt-api'].days_remaining |
        default(certificates.server.days_remaining) }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create Salt API private key

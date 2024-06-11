{%- from "metalk8s/map.jinja" import backup_server, coredns, certificates with context %}

{%- set private_key_path = "/etc/metalk8s/pki/backup-server/server.key" %}

Create backup server private key:
  x509.private_key_managed:
    - name: {{ private_key_path }}
{%- if salt["salt_version.greater_than"]("Sulfur") %}
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
    'backup',
    'backup.kube-system',
    'backup.kube-system.svc',
    'backup.kube-system.svc.' ~ coredns.cluster_domain,
] %}

Generate backup server certificate:
  x509.certificate_managed:
    - name: {{ certificates.server.files["backup-server"].path }}
{%- if salt["salt_version.greater_than"]("Sulfur") %}
    - private_key: {{ private_key_path }}
{%- else %}
    - public_key: {{ private_key_path }}
{%- endif %}
    - ca_server: {{ pillar.metalk8s.ca.minion }}
    - signing_policy: {{ backup_server.cert.server_signing_policy }}
    - CN: backup
    - subjectAltName: "{{ salt['metalk8s.format_san'](certSANs | unique) }}"
    - days_valid: {{
        certificates.server.files["backup-server"].days_valid |
        default(certificates.server.days_valid) }}
    - days_remaining: {{
        certificates.server.files["backup-server"].days_remaining |
        default(certificates.server.days_remaining) }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create backup server private key

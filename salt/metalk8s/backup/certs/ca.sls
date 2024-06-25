{%- from "metalk8s/map.jinja" import backup_server with context %}

{%- set private_key_path = "/etc/metalk8s/pki/backup-server/ca.key" %}

Create backup server CA private key:
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

Generate backup server CA certificate:
  x509.certificate_managed:
    - name: /etc/metalk8s/pki/backup-server/ca.crt
    - signing_private_key: {{ private_key_path }}
    - CN: backup-server-ca
    - keyUsage: "critical digitalSignature, keyEncipherment, keyCertSign"
    - basicConstraints: "critical CA:true"
    - days_valid: {{ backup_server.ca.cert.days_valid }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create backup server CA private key

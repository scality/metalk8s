{%- from "metalk8s/map.jinja" import nginx_ingress with context %}

{%- set private_key_path = "/etc/metalk8s/pki/nginx-ingress/ca.key" %}

Create Ingress CA private key:
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

Generate Ingress CA certificate:
  x509.certificate_managed:
    - name: /etc/metalk8s/pki/nginx-ingress/ca.crt
    - signing_private_key: {{ private_key_path }}
    - CN: ingress-ca
    - keyUsage: "critical digitalSignature, keyEncipherment, keyCertSign"
    - basicConstraints: "critical CA:true"
    - days_valid: {{ nginx_ingress.ca.cert.days_valid }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create Ingress CA private key

Advertise Ingress CA certificate in the mine:
  module.wait:
    - mine.send:
      - ingress_ca_b64
      - mine_function: hashutil.base64_encodefile
      - /etc/metalk8s/pki/nginx-ingress/ca.crt
    - watch:
      - x509: Generate Ingress CA certificate

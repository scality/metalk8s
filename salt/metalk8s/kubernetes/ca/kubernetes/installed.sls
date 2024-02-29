{%- from "metalk8s/map.jinja" import ca with context %}

{%- set private_key_path = "/etc/kubernetes/pki/ca.key" %}

Create CA private key:
  x509.private_key_managed:
    - name: {{ private_key_path }}
    - keysize: 4096
    - user: root
    - group: root
    - mode: '0600'
    - makedirs: True
    - dir_mode: '0755'
    - unless:
      - test -f "{{ private_key_path }}"

Generate CA certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/ca.crt
    - signing_private_key: {{ private_key_path }}
    - CN: kubernetes
    - keyUsage: "critical digitalSignature, keyEncipherment, keyCertSign"
    - basicConstraints: "critical CA:true"
    - days_valid: {{ ca.cert.days_valid }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create CA private key

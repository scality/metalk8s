{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import front_proxy with context %}

{%- set private_key_path = "/etc/kubernetes/pki/front-proxy-client.key" %}

Create front proxy client private key:
  x509.private_key_managed:
    - name: {{ private_key_path }}
    - keysize: 2048
    - user: root
    - group: root
    - mode: '0600'
    - makedirs: True
    - dir_mode: '0755'
    - unless:
      - test -f "{{ private_key_path }}"

Generate front proxy client certificate:
  x509.certificate_managed:
    - name: {{ certificates.client.files['front-proxy'].path }}
    - private_key: {{ private_key_path }}
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ front_proxy.cert.client_signing_policy }}
    - CN: front-proxy-client
    - days_valid: {{
        certificates.client.files['front-proxy'].days_valid |
        default(certificates.client.days_valid) }}
    - days_remaining: {{
        certificates.client.files['front-proxy'].days_remaining |
        default(certificates.client.days_remaining) }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create front proxy client private key

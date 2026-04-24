{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import etcd with context %}

{%- set private_key_path = "/etc/kubernetes/pki/etcd/salt-master-etcd-client.key" %}

include:
  - metalk8s.internal.m2crypto

Create salt master etcd client private key:
  x509.private_key_managed:
    - name: {{ private_key_path }}
    - keysize: 2048
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

Generate salt master etcd client certificate:
  x509.certificate_managed:
    - name: {{ certificates.client.files['salt-master-etcd'].path }}
{%- if salt.salt_version.greater_than("Phosphorus") %}
{#- NOTE: This if block is needed since during upgrade this state is called with
    older salt version
    This if block can be removed in `development/135` #}
    - private_key: {{ private_key_path }}
{%- else %}
    - public_key: {{ private_key_path }}
{%- endif %}
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ etcd.cert.apiserver_client_signing_policy }}
    - CN: etcd-salt-master-client
    - authorityKeyIdentifier: keyid
    - days_valid: {{
        certificates.client.files['salt-master-etcd'].days_valid |
        default(certificates.client.days_valid) }}
    - days_remaining: {{
        certificates.client.files['salt-master-etcd'].days_remaining |
        default(certificates.client.days_remaining) }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create salt master etcd client private key

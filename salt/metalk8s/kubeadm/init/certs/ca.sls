{%- from "metalk8s/map.jinja" import ca with context %}

{%- set ca_server = salt['mine.get']('*', 'kubernetes_ca_server') %}

{#- Check if we have no CA server or only current minion as CA #}
{%- if not ca_server or ca_server.keys() == [grains['id']] %}

include:
  - .installed

Create CA private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/ca.key
    - bits: 4096
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - pkg: Install m2crypto

Generate CA certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/ca.crt
    - signing_private_key: /etc/kubernetes/pki/ca.key
    - CN: kubernetes
    - keyUsage: "critical digitalSignature, keyEncipherment, keyCertSign"
    - basicConstraints: "critical CA:true"
    - days_valid: {{ ca.cert.days_valid }}
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create CA private key

# TODO: Find a better way to advetise CA server
Advertise CA in the mine:
  module.wait:
    - mine.send:
      - func: 'kubernetes_ca_server'
      - mine_function: test.ping
    - watch:
      - x509: Generate CA certificate

Create CA salt signing_policies:
  file.serialize:
    - name: /etc/salt/minion.d/30-metalk8s_ca_signing_policies.conf
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - formatter: yaml
    - dataset:
        x509_signing_policies:
          kube_apiserver_server_policy:
            - minions: '*'
            - signing_private_key: /etc/kubernetes/pki/ca.key
            - signing_cert: /etc/kubernetes/pki/ca.crt
            - keyUsage: "critical digitalSignature, keyEncipherment"
            - extendedKeyUsage: "serverAuth"
            - days_valid: {{ ca.signing_policy.days_valid }}
          kube_apiserver_client_policy:
            - minions: '*'
            - signing_private_key: /etc/kubernetes/pki/ca.key
            - signing_cert: /etc/kubernetes/pki/ca.crt
            - keyUsage: "critical digitalSignature, keyEncipherment"
            - extendedKeyUsage: "clientAuth"
            - days_valid: {{ ca.signing_policy.days_valid }}

Restart salt-minion:
  cmd.run:
    - name: 'salt-call --local service.restart salt-minion'
    - bg: true
    - onchanges:
      - file: Create CA salt signing_policies

Wait until salt-minion restarted:
  module.wait:
    - test.sleep:
      - length: 5
    - watch:
      - cmd: Restart salt-minion

{%- else %}

{{ ca_server.keys()|join(', ') }} already configured as Kubernetes CA server, only one can be declared:
  test.fail_without_changes: []

{%- endif %}

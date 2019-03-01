{%- from "metalk8s/map.jinja" import front_proxy with context %}

{%- set front_proxy_ca_server = salt['mine.get']('*', 'kubernetes_front_proxy_ca_server') %}

{#- Check if we have no CA server or only current minion as CA #}
{%- if not front_proxy_ca_server or front_proxy_ca_server.keys() == [grains['id']] %}

include:
  - .installed
  - metalk8s.salt.minion.running

Create front proxy CA private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/front-proxy-ca.key
    - bits: 4096
    - verbose: False
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - pkg: Install m2crypto

Generate front proxy CA certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/front-proxy-ca.crt
    - signing_private_key: /etc/kubernetes/pki/front-proxy-ca.key
    - CN: front-proxy-ca
    - keyUsage: "critical digitalSignature, keyEncipherment, keyCertSign"
    - basicConstraints: "critical CA:true"
    - days_valid: {{ front_proxy.ca.cert.days_valid }}
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create front proxy CA private key

# TODO: Find a better way to advertise CA server
Advertise front proxy CA in the mine:
  module.wait:
    - mine.send:
      - func: 'kubernetes_front_proxy_ca_server'
      - mine_function: hashutil.base64_encodefile
      - /etc/kubernetes/pki/front-proxy-ca.crt
    - watch:
      - x509: Generate front proxy CA certificate

Create front proxy CA salt signing policies:
  file.serialize:
    - name: /etc/salt/minion.d/30-metalk8s-front-proxy-ca-signing-policies.conf
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - formatter: yaml
    - dataset:
        x509_signing_policies:
          front_proxy_client_policy:
            - minions: '*'
            - signing_private_key: /etc/kubernetes/pki/front-proxy-ca.key
            - signing_cert: /etc/kubernetes/pki/front-proxy-ca.crt
            - keyUsage: "critical digitalSignature, keyEncipherment"
            - extendedKeyUsage: "clientAuth"
            - days_valid: {{ front_proxy.ca.signing_policy.days_valid }}
    - watch_in:
      - cmd: Restart salt-minion

{%- else %}

{{ front_proxy_ca_server.keys()|join(', ') }} already configured as Kubernetes front proxy CA server, only one can be declared:
  test.fail_without_changes: []

{%- endif %}

# If an encryption key is available via the pillar, use that one.
# If not, and we are the bootstrap node:
#   * we are responsible for generating the encryption key
#   * we should immediately use the configuration
#     (i.e. this state should always execute before `.installed`)
# Either way, create the encryption configuration file using the computed key.

include:
  - .installed

{% set encryption_source_path = '/etc/metalk8s/crypt/apiserver.key' %}
{% set encryption_k8s_path = '/etc/kubernetes/encryption.conf' %}

{% if 'apiserver_key' not in pillar.metalk8s.private %}

{% set encryption_key = salt['random.get_str'](32, punctuation=false) | base64_encode %}

Create encryption configuration from scratch:
  file.managed:
    - name: {{ encryption_source_path }}
    - mode: '0600'
    - makedirs: True
    - contents: {{ encryption_key }}

{% else %}

{% set encryption_key = salt.pillar.get('metalk8s:private:apiserver_key') %}

{% endif %}

Recreate encryption configuration from pillar:
  file.serialize:
    - name: {{ encryption_k8s_path }}
    - mode: '0600'
    - dataset:
        apiVersion: apiserver.config.k8s.io/v1
        kind: EncryptionConfiguration
        resources:
          - resources:
            - secrets
            providers:
            - aescbc:
                keys:
                - name: metalk8s-secrets-key
                  secret: {{ encryption_key }}
            - identity: {}
    - require_in:
      - metalk8s: Create kube-apiserver Pod manifest

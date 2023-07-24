{%- set private_key_path = "/etc/kubernetes/pki/sa.key" %}

include:
  - metalk8s.internal.m2crypto

Create SA private key:
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

Store SA public key:
  file.managed:
    - name: /etc/kubernetes/pki/sa.pub
    - contents: __slot__:salt:x509.get_public_key("{{ private_key_path }}")
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create SA private key

Advertise SA pub key in the mine:
  module.run:
    - mine.send:
      - kubernetes_sa_pub_key_b64
      - mine_function: hashutil.base64_encodefile
      - /etc/kubernetes/pki/sa.pub
    - onchanges:
      - file: Store SA public key

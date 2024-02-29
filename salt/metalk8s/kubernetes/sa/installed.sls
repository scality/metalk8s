{%- set private_key_path = "/etc/kubernetes/pki/sa.key" %}

Create SA private key:
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
  module.wait:
    - mine.send:
      - kubernetes_sa_pub_key_b64
      - mine_function: hashutil.base64_encodefile
      - /etc/kubernetes/pki/sa.pub
    - watch:
      - file: Store SA public key

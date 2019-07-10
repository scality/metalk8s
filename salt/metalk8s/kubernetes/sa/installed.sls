include:
  - metalk8s.internal.m2crypto

Create SA private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/sa.key
    - bits: 2048
    - verbose: False
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - metalk8s_package_manager: Install m2crypto

Store SA public key:
  file.managed:
    - name: /etc/kubernetes/pki/sa.pub
    - contents: __slot__:salt:x509.get_public_key("/etc/kubernetes/pki/sa.key")
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create SA private key

Advertise SA pub key in the mine:
  module.wait:
    - mine.send:
      - func: kubernetes_sa_pub_key_b64
      - mine_function: hashutil.base64_encodefile
      - /etc/kubernetes/pki/sa.pub
    - watch:
      - file: Store SA public key

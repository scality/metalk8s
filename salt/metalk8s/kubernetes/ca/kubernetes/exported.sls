include:
  - .installed

Advertise CA certificate in the mine:
  module.wait:
    - mine.send:
      - func: 'kubernetes_root_ca_b64'
      - mine_function: hashutil.base64_encodefile
      - /etc/kubernetes/pki/ca.crt
    - watch:
      - x509: Generate CA certificate

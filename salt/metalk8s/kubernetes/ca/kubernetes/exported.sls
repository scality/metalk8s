include:
  - .installed

Advertise CA certificate in the mine:
  module.run:
    - mine.send:
      - kubernetes_root_ca_b64
      - mine_function: hashutil.base64_encodefile
      - /etc/kubernetes/pki/ca.crt
    - onchanges:
      - x509: Generate CA certificate

{%- from "metalk8s/map.jinja" import kube_api with context %}

include:
  - metalk8s.internal.m2crypto

Create kube-apiserver kubelet client private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/apiserver-kubelet-client.key
    - bits: 2048
    - verbose: False
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - metalk8s_package_manager: Install m2crypto

Generate kube-apiserver kubelet client certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/apiserver-kubelet-client.crt
    - public_key: /etc/kubernetes/pki/apiserver-kubelet-client.key
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ kube_api.cert.client_signing_policy }}
    - CN: kube-apiserver-kubelet-client
    - O: "system:masters"
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create kube-apiserver kubelet client private key

{%- from "metalk8s/map.jinja" import kube_api with context %}

include:
  - .installed

Create kube-apiserver private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/apiserver.key
    - bits: 2048
    - verbose: False
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - pkg: Install m2crypto

Generate kube-apiserver certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/apiserver.crt
    - public_key: /etc/kubernetes/pki/apiserver.key
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ kube_api.cert.server_signing_policy }}
    - CN: kube-apiserver
    - subjectAltName: "DNS:{{ grains['fqdn'] }}, DNS:kubernetes, DNS:kubernetes.default, DNS:kubernetes.default.svc, DNS:kubernetes.default.svc.cluster.local, IP:{{ kube_api.service_ip }}, IP:{{ grains['metalk8s']['control_plane_ip'] }}"
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create kube-apiserver private key

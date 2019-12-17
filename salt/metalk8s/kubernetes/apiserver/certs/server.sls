{%- from "metalk8s/map.jinja" import kube_api with context %}

{%- set kubernetes_service_ip = salt.metalk8s_network.get_kubernetes_service_ip() %}

include:
  - metalk8s.internal.m2crypto

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
      - metalk8s_package_manager: Install m2crypto

{% set certSANs = [
    grains['fqdn'],
    'kubernetes',
    'kubernetes.default',
    'kubernetes.default.svc',
    'kubernetes.default.svc.cluster.local',
    kubernetes_service_ip,
    grains['metalk8s']['control_plane_ip'],
    '127.0.0.1',
]
%}

Generate kube-apiserver certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/apiserver.crt
    - public_key: /etc/kubernetes/pki/apiserver.key
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ kube_api.cert.server_signing_policy }}
    - CN: kube-apiserver
    - subjectAltName: "{{ salt['metalk8s.format_san'](certSANs | unique) }}"
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create kube-apiserver private key

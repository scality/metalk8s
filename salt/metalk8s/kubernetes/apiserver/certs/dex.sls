{%- from "metalk8s/map.jinja" import kube_api with context %}

include:
  - metalk8s.internal.m2crypto

Create dex CA private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/dex.key
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
    grains['metalk8s']['workload_plane_ip'],
    'dex.default'
]
%} 

Generate dex CA certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/dex.crt
    - public_key: /etc/kubernetes/pki/dex.key
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ kube_api.cert.server_signing_policy }}
    - CN: dex-ca
    - subjectAltName: "{{ salt['metalk8s.format_san'](certSANs | unique) }}"
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create dex CA private key

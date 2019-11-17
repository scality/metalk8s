{%- from "metalk8s/map.jinja" import nginx_ingress with context %}

include:
  - metalk8s.internal.m2crypto

Create Workload-Plane Ingress server private key:
  x509.private_key_managed:
    - name: /etc/metalk8s/pki/nginx-ingress/workload-plane-server.key
    - bits: 4096
    - verbose: False
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - metalk8s_package_manager: Install m2crypto

{# TODO: add Ingress Service IP once stable (LoadBalancer probably) #}
{%- set certSANs = [
    grains.fqdn,
    'localhost',
    '127.0.0.1',
    'nginx-ingress-workload-plane',
    'nginx-ingress-workload-plane.metalk8s-ingress',
    'nginx-ingress-workload-plane.metalk8s-ingress.svc',
    'nginx-ingress-workload-plane.metalk8s-ingress.svc.cluster.local',
    grains.metalk8s.workload_plane_ip,
] %}

Generate Workload-Plane Ingress server certificate:
  x509.certificate_managed:
    - name: /etc/metalk8s/pki/nginx-ingress/workload-plane-server.crt
    - public_key: /etc/metalk8s/pki/nginx-ingress/workload-plane-server.key
    - ca_server: {{ pillar.metalk8s.ca.minion }}
    - signing_policy: {{ nginx_ingress.cert.server_signing_policy }}
    - CN: nginx-ingress-workload-plane-server
    - subjectAltName: "{{ salt['metalk8s.format_san'](certSANs | unique) }}"
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create Workload-Plane Ingress server private key

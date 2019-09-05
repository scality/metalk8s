{%- from "metalk8s/map.jinja" import kube_api with context %}

include:
  - metalk8s.internal.m2crypto

Create Salt API private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/salt-api.key
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
    'salt-master',
    'salt-master.kube-system',
    'salt-master.kube-system.svc',
    'salt-master.kube-system.svc.cluster.local',
    grains['metalk8s']['control_plane_ip'],
]
%}

Generate Salt API certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/salt-api.crt
    - public_key: /etc/kubernetes/pki/salt-api.key
{%- if salt.config.get('file_client') != 'local' %}
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
{%- endif %}
    - signing_policy: {{ kube_api.cert.server_signing_policy }}
    - CN: salt-api on {{ grains.id }}
    - subjectAltName: "{{ salt['metalk8s.format_san'](certSANs | unique) }}"
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create Salt API private key

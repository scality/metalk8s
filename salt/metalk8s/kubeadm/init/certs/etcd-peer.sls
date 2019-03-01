{%- from "metalk8s/map.jinja" import etcd with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

{%- set etcd_ca_server = salt['mine.get']('*', 'kubernetes_etcd_ca_server').keys() %}
{%- if etcd_ca_server %}

include:
  - .installed

Create etcd peer private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/etcd/peer.key
    - bits: 2048
    - verbose: False
    - user: root
    - group: root
    - mode: 600
    - makedirs: True
    - dir_mode: 755
    - require:
      - pkg: Install m2crypto

Generate etcd peer certificate:
  x509.certificate_managed:
    - name: /etc/kubernetes/pki/etcd/peer.crt
    - public_key: /etc/kubernetes/pki/etcd/peer.key
    - ca_server: {{ etcd_ca_server[0] }}
    - signing_policy: {{ etcd.cert.peer_signing_policy }}
    - CN: "{{ grains['fqdn'] }}"
    - subjectAltName: "DNS:{{ grains['fqdn'] }}, DNS:localhost, IP:{{ salt['network.ip_addrs'](cidr=networks.control_plane) | join(', IP:') }}, IP:127.0.0.1"
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create etcd peer private key

{%- else %}

Unable to generate etcd peer certificate, no CA server available:
  test.fail_without_changes: []

{%- endif %}

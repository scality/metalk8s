{%- from "metalk8s/map.jinja" import kube_api with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

{%- set ca_server = salt['mine.get']('*', 'kubernetes_ca_server').keys() %}
{%- if ca_server %}

include:
  - .installed

Create kube-apiserver private key:
  x509.private_key_managed:
    - name: /etc/kubernetes/pki/apiserver.key
    - bits: 2048
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
    - ca_server: {{ ca_server[0] }}
    - signing_policy: {{ kube_api.cert.server_signing_policy }}
    - CN: kube-apiserver
    - subjectAltName: "DNS:{{ grains['fqdn'] }}, DNS:kubernetes, DNS:kubernetes.default, DNS:kubernetes.default.svc, DNS:kubernetes.default.svc.cluster.local, IP:{{ kube_api.service_ip }}, IP:{{ salt['network.ip_addrs'](cidr=networks.control_plane) | join(', IP:') }}"
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - require:
      - x509: Create kube-apiserver private key

{%- else %}

Unable to generate kube-apiserver certificate, no CA Server available:
  test.fail_without_changes: []

{%- endif %}

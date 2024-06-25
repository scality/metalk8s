{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import coredns with context %}
{%- from "metalk8s/map.jinja" import kube_api with context %}

{%- set kubernetes_service_ip = salt.metalk8s_network.get_kubernetes_service_ip() %}
{%- set private_key_path = "/etc/kubernetes/pki/apiserver.key" %}

Create kube-apiserver private key:
  x509.private_key_managed:
    - name: {{ private_key_path }}
{%- if salt["salt_version.greater_than"]("Phosphorus") %}
    - keysize: 2048
{%- else %}
    - bits: 2048
{%- endif %}
    - user: root
    - group: root
    - mode: '0600'
    - makedirs: True
    - dir_mode: '0755'
    - unless:
      - test -f "{{ private_key_path }}"

{% set certSANs = [
    grains['fqdn'],
    'kubernetes',
    'kubernetes.default',
    'kubernetes.default.svc',
    'kubernetes.default.svc.' ~ coredns.cluster_domain,
    kubernetes_service_ip,
    grains['metalk8s']['control_plane_ip'],
    '127.0.0.1',
]
%}

Generate kube-apiserver certificate:
  x509.certificate_managed:
    - name: {{ certificates.server.files.apiserver.path }}
{%- if salt["salt_version.greater_than"]("Phosphorus") %}
    - private_key: {{ private_key_path }}
{%- else %}
    - public_key: {{ private_key_path }}
{%- endif %}
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ kube_api.cert.server_signing_policy }}
    - CN: kube-apiserver
    - subjectAltName: "{{ salt['metalk8s.format_san'](certSANs | unique) }}"
    - days_valid: {{
        certificates.server.files.apiserver.days_valid |
        default(certificates.server.days_valid) }}
    - days_remaining: {{
        certificates.server.files.apiserver.days_remaining |
        default(certificates.server.days_remaining) }}
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - require:
      - x509: Create kube-apiserver private key

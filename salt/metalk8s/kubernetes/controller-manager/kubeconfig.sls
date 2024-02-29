{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import kube_api with context %}
{%- from "metalk8s/map.jinja" import kubernetes with context %}

{%- set apiserver = 'https://127.0.0.1:7443' %}

Create kubeconfig file for controller-manager:
  metalk8s_kubeconfig.managed:
    - name: {{ certificates.kubeconfig.files['controller-manager'].path }}
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ kube_api.cert.client_signing_policy }}
    - client_cert_info:
        CN: "system:kube-controller-manager"
    - apiserver: {{ apiserver }}
    - cluster: {{ kubernetes.cluster }}
    - days_valid: {{
        certificates.kubeconfig.files['controller-manager'].days_valid |
        default(certificates.kubeconfig.days_valid) }}
    - days_remaining: {{
        certificates.kubeconfig.files['controller-manager'].days_remaining |
        default(certificates.kubeconfig.days_remaining) }}

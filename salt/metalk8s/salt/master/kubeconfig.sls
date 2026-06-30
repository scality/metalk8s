{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import kube_api with context %}
{%- from "metalk8s/map.jinja" import kubernetes with context %}

Create kubeconfig file for Salt Master:
  metalk8s_kubeconfig.managed:
    - name: {{ certificates.kubeconfig.files['salt-master'].path }}
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ kube_api.cert.client_signing_policy }}
    - client_cert_info:
        CN: "salt-master-{{ grains.id }}"
        O: "system:masters"
    - apiserver: "https://127.0.0.1:7443"
    - cluster: {{ kubernetes.cluster }}
    - days_valid: {{
        certificates.kubeconfig.files['salt-master'].days_valid |
        default(certificates.kubeconfig.days_valid) }}
    - days_remaining: {{
        certificates.kubeconfig.files['salt-master'].days_remaining |
        default(certificates.kubeconfig.days_remaining) }}

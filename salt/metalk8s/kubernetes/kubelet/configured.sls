{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import kube_api with context %}
{%- from "metalk8s/map.jinja" import kubernetes with context %}

include:
  - .standalone
  - metalk8s.internal.m2crypto
  - metalk8s.kubernetes.ca.kubernetes.advertised

{%- set apiserver = 'https://127.0.0.1:7443' %}

Create kubeconfig file for kubelet:
  metalk8s_kubeconfig.managed:
    - name: {{ certificates.kubeconfig.files.kubelet.path }}
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ kube_api.cert.client_signing_policy }}
    - client_cert_info:
        CN: "system:node:{{ grains['id'] }}"
        O: "system:nodes"
    - apiserver: {{ apiserver }}
    - cluster: {{ kubernetes.cluster }}
    - days_valid: {{
        certificates.kubeconfig.files.kubelet.days_valid |
        default(certificates.kubeconfig.days_valid) }}
    - days_remaining: {{
        certificates.kubeconfig.files.kubelet.days_remaining |
        default(certificates.kubeconfig.days_remaining) }}
    - require:
      - metalk8s_package_manager: Install m2crypto
    - watch_in:
      - service: Ensure kubelet running

Configure kubelet service:
  file.managed:
    - name: /etc/systemd/system/kubelet.service.d/10-metalk8s.conf
    - source: salt://{{ slspath }}/files/service-{{ grains['init'] }}.conf.j2
    - template: jinja
    - user: root
    - group : root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - context:
        env_file: "/var/lib/kubelet/kubeadm-flags.env"
        config_file: "/var/lib/kubelet/config.yaml"
        kubeconfig: {{ certificates.kubeconfig.files.kubelet.path }}
    - require:
      - metalk8s_package_manager: Install kubelet
      - metalk8s_kubeconfig: Create kubeconfig file for kubelet
    - watch_in:
      - service: Ensure kubelet running

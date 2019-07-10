{%- from "metalk8s/map.jinja" import kube_api with context %}
{%- from "metalk8s/map.jinja" import kubernetes with context %}

include:
  - .standalone
  - metalk8s.internal.m2crypto
  - metalk8s.kubernetes.ca.kubernetes.advertised

{%- set apiserver = 'https://' ~ pillar.metalk8s.api_server.host ~ ':6443' %}

Create kubeconfig file for kubelet:
  metalk8s_kubeconfig.managed:
    - name: /etc/kubernetes/kubelet.conf
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ kube_api.cert.client_signing_policy }}
    - client_cert_info:
        CN: "system:node:{{ grains['id'] }}"
        O: "system:nodes"
    - apiserver: {{ apiserver }}
    - cluster: {{ kubernetes.cluster }}
    - require:
      - metalk8s_package_manager: Install m2crypto
    - watch_in:
      - service: Ensure kubelet running

Configure kubelet service:
  file.managed:
    - name: /etc/systemd/system/kubelet.service.d/10-metalk8s.conf
    - source: salt://{{ slspath }}/files/service-{{ grains['init'] }}.conf
    - template: jinja
    - user: root
    - group : root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - context:
        env_file: "/var/lib/kubelet/kubeadm-flags.env"
        config_file: "/var/lib/kubelet/config.yaml"
    - require:
      - metalk8s_package_manager: Install kubelet
      - metalk8s_kubeconfig: Create kubeconfig file for kubelet
    - watch_in:
      - service: Ensure kubelet running

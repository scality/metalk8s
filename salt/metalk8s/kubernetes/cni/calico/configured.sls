{%- from "metalk8s/map.jinja" import certificates with context %}
{%- from "metalk8s/map.jinja" import kube_api with context %}
{%- from "metalk8s/map.jinja" import kubernetes with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

{%- set kubernetes_service_ip = salt.metalk8s_network.get_kubernetes_service_ip() %}

{#- Check that workload MTU configured is smaller than the local workload interface one #}
{%- set workload_local_mtu = salt.metalk8s_network.get_mtu_from_ip(grains.metalk8s.workload_plane_ip) %}
{%- if networks.workload_plane.mtu > workload_local_mtu %}
  {{ raise('Trying to configure CNI with ' ~ networks.workload_plane.mtu
           ~ ' MTU but local workload interface MTU is smaller: ' ~ workload_local_mtu) }}
{%- endif %}

include:
  - metalk8s.internal.m2crypto

Create kubeconf file for calico:
  metalk8s_kubeconfig.managed:
    - name: {{ certificates.kubeconfig.files.calico.path }}
    - ca_server: {{ pillar['metalk8s']['ca']['minion'] }}
    - signing_policy: {{ kube_api.cert.client_signing_policy }}
    - client_cert_info:
        CN: {{ grains.id }}
        O: metalk8s:calico-node
    - apiserver: https://{{ kubernetes_service_ip }}:443
    - cluster: {{ kubernetes.cluster }}
    - days_valid: {{
        certificates.kubeconfig.files.calico.days_valid |
        default(certificates.kubeconfig.days_valid) }}
    - days_remaining: {{
        certificates.kubeconfig.files.calico.days_remaining |
        default(certificates.kubeconfig.days_remaining) }}
    - require:
      - metalk8s_package_manager: Install m2crypto

Create CNI calico configuration file:
  file.serialize:
    - name: /etc/cni/net.d/10-calico.conflist
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - formatter: json
    - dataset:
        name: k8s-pod-network
        cniVersion: "0.3.1"
        plugins:
          - type: "calico"
            log_level: "info"
            datastore_type: "kubernetes"
            nodename: {{ grains.id }}
            # NOTE: MTU for calico = workload MTU - 20 (for IPinIP header)
            mtu: {{ networks.workload_plane.mtu - 20 }}
            ipam:
              type: "calico-ipam"
            policy:
              type: "k8s"
            kubernetes:
              kubeconfig: "{{ certificates.kubeconfig.files.calico.path }}"
          - type: "portmap"
            snat: true
            capabilities:
              portMappings: true
            conditionsV4: ["-d", "{{ grains.metalk8s.workload_plane_ip }}/32,127.0.0.1/32"]
          # Note: Calico upstream enables the `bandwidth` CNI plugin by default.
          # However, this plugin (executable) is not available in the CNI RPM
          # package we currently install. Hence, not enabling this functionality
          # (for now).
          #- type: "bandwidth"
          #  capabilities:
          #    bandwidth: true
    - require:
      - metalk8s_kubeconfig: Create kubeconf file for calico

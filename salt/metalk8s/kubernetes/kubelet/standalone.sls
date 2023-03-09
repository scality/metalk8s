{%- from "metalk8s/map.jinja" import coredns with context %}
{%- from "metalk8s/map.jinja" import kubelet with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- set cluster_dns_ip = salt.metalk8s_network.get_cluster_dns_ip() %}

include:
  - .running

Ensure resolv config file exists:
  file.managed:
    - name: {{ kubelet.config.resolvConf }}
    - create: true
    - replace: false

Create kubelet service environment file:
  file.managed:
    - name: "/var/lib/kubelet/kubeadm-flags.env"
    - source: salt://{{ slspath }}/files/kubeadm.env.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0750'
    - context:
    - context:
        options:
      {%- for opt, value in kubelet.service.options.items() %}
          {{ opt }}: {{ value }}
      {%- endfor %}
          node-ip: {{ grains['metalk8s']['control_plane_ip'] }}
          hostname-override: {{ grains['id'] }}
          cgroup-driver: systemd
          pod-infra-container-image: {{ build_image_name("pause") }}
          v: {{ 2 if metalk8s.debug else 0 }}
    - require:
      - metalk8s_package_manager: Install kubelet
    - watch_in:
      - service: Ensure kubelet running

Create kubelet config file:
  file.serialize:
    - name: "/var/lib/kubelet/config.yaml"
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0750'
    - formatter: yaml
    - dataset:
      # kubeadm config {
        apiVersion: kubelet.config.k8s.io/v1beta1
        authentication:
          anonymous:
            enabled: false
          webhook:
            cacheTTL: 0s
            enabled: true
          x509:
            clientCAFile: /etc/kubernetes/pki/ca.crt
        authorization:
          mode: Webhook
          webhook:
            cacheAuthorizedTTL: 0s
            cacheUnauthorizedTTL: 0s
        cgroupDriver: systemd
        clusterDNS:
          - {{ cluster_dns_ip }}
        clusterDomain: {{ coredns.cluster_domain }}
        cpuManagerReconcilePeriod: 0s
        evictionPressureTransitionPeriod: 0s
        fileCheckFrequency: 0s
        healthzBindAddress: 127.0.0.1
        healthzPort: 10248
        httpCheckFrequency: 0s
        imageMinimumGCAge: 0s
        kind: KubeletConfiguration
        logging:
          flushFrequency: 0
          options:
            json:
              infoBufferSize: "0"
          verbosity: 0
        memorySwap: {}
        nodeStatusReportFrequency: 0s
        nodeStatusUpdateFrequency: 0s
        # Disable rotate Certificates as we manage certificate rotation ourself
        # with salt
        # rotateCertificates: true
        runtimeRequestTimeout: 0s
        shutdownGracePeriod: 0s
        shutdownGracePeriodCriticalPods: 0s
        staticPodPath: /etc/kubernetes/manifests
        streamingConnectionIdleTimeout: 0s
        syncFrequency: 0s
        volumeStatsAggPeriod: 0s
      # }
        address: {{ grains['metalk8s']['control_plane_ip'] }}
        rotateCertificates: false
        port: 10250
        {%- if pillar.get("kubernetes:kubelet:config:maxPods") %}
        maxPods: {{ pillar.kubernetes.kubelet.config.maxPods }}
        {%- endif %}
{%- for key, value in kubelet.config.items() %}
        {{ key }}: {{ value }}
{%- endfor %}
    - require:
      - metalk8s_package_manager: Install kubelet
      - file: Ensure resolv config file exists
    - watch_in:
      - service: Ensure kubelet running

Configure kubelet service as standalone:
  file.managed:
    - name: /etc/systemd/system/kubelet.service.d/09-standalone.conf
    - source: salt://{{ slspath }}/files/service-standalone-{{ grains['init'] }}.conf.j2
    - template: jinja
    - user: root
    - group: root
    - mode: '0644'
    - makedirs: True
    - dir_mode: '0755'
    - context:
        env_file: "/var/lib/kubelet/kubeadm-flags.env"
        manifest_path: "/etc/kubernetes/manifests"
    - require:
      - file: Create kubelet service environment file
      - file: Create kubelet config file
    - watch_in:
      - service: Ensure kubelet running

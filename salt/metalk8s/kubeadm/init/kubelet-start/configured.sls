{%- from "metalk8s/map.jinja" import kubelet with context %}
{% from "metalk8s/map.jinja" import networks with context %}

{% set ip_candidates = salt.network.ip_addrs(cidr=networks.control_plane) %}
{% if ip_candidates %}
{% set bind_address = ip_candidates[0] %}
Create kubelet service environment file:
  file.managed:
    - name: "/var/lib/kubelet/kubeadm-flags.env"
    - source: salt://metalk8s/kubeadm/init/kubelet-start/files/kubeadm.env
    - template: jinja
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 750
    - context:
        options: {{ kubelet.service.options | tojson }}

Create kubelet config file:
  file.serialize:
    - name: "/var/lib/kubelet/config.yaml"
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 750
    - formatter: yaml
    - dataset:
        address: {{ bind_address }}
        kind: KubeletConfiguration
        apiVersion: kubelet.config.k8s.io/v1beta1
        staticPodPath: /etc/kubernetes/manifests
        authentication:
          anonymous:
            enabled: false
          webhook:
            cacheTTL: 2m0s
            enabled: true
          x509:
            clientCAFile: /etc/kubernetes/pki/ca.crt
        authorization:
          mode: Webhook
          webhook:
            cacheAuthorizedTTL: 5m0s
            cacheUnauthorizedTTL: 30s
        cgroupDriver: cgroupfs
        cgroupsPerQOS: true
        clusterDNS:
          - 10.96.0.10
        clusterDomain: cluster.local
        configMapAndSecretChangeDetectionStrategy: Watch
        containerLogMaxFiles: 5
        containerLogMaxSize: 10Mi
        contentType: application/vnd.kubernetes.protobuf
        cpuCFSQuota: true
        cpuCFSQuotaPeriod: 100ms
        cpuManagerPolicy: none
        cpuManagerReconcilePeriod: 10s
        enableControllerAttachDetach: true
        enableDebuggingHandlers: true
        enforceNodeAllocatable:
          - pods
        eventBurst: 10
        eventRecordQPS: 5
        evictionHard:
          imagefs.available: 15%
          memory.available: 100Mi
          nodefs.available: 10%
          nodefs.inodesFree: 5%
        evictionPressureTransitionPeriod: 5m0s
        failSwapOn: true
        fileCheckFrequency: 20s
        hairpinMode: promiscuous-bridge
        healthzBindAddress: 127.0.0.1
        healthzPort: 10248
        httpCheckFrequency: 20s
        imageGCHighThresholdPercent: 85
        imageGCLowThresholdPercent: 80
        imageMinimumGCAge: 2m0s
        iptablesDropBit: 15
        iptablesMasqueradeBit: 14
        kubeAPIBurst: 10
        kubeAPIQPS: 5
        makeIPTablesUtilChains: true
        maxOpenFiles: 1000000
        maxPods: 110
        nodeLeaseDurationSeconds: 40
        nodeStatusReportFrequency: 1m0s
        nodeStatusUpdateFrequency: 10s
        oomScoreAdj: -999
        podPidsLimit: -1
        port: 10250
        registryBurst: 10
        registryPullQPS: 5
        resolvConf: /etc/resolv.conf
        rotateCertificates: true
        runtimeRequestTimeout: 2m0s
        serializeImagePulls: true
        streamingConnectionIdleTimeout: 4h0m0s
        syncFrequency: 1m0s
        volumeStatsAggPeriod: 1m0s

Configure kubelet service as standalone:
  file.managed:
    - name: /etc/systemd/system/kubelet.service.d/09-standalone.conf
    - source: salt://metalk8s/kubeadm/init/kubelet-start/files/service-kubelet-{{ grains['init'] }}.conf
    - template: jinja
    - user: root
    - group: root
    - mode: 644
    - makedirs: True
    - dir_mode: 755
    - context:
        env_file: "/var/lib/kubelet/kubeadm-flags.env"
        manifest_path: "/etc/kubernetes/manifests"
    - require:
      - file: Create kubelet service environment file
      - file: Create kubelet config file

Start and enable kubelet:
  service.running:
    - name: kubelet
    - enable: True
    - watch:
      - file: Create kubelet service environment file
      - file: Create kubelet config file
      - file: Configure kubelet service as standalone
{% else %}
No available advertise IP for kubelet:
  test.fail_without_changes:
    - msg: "Could not find available IP in {{ networks.control_plane }}"
{% endif %}

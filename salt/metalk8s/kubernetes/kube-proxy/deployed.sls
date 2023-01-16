{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import metalk8s with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

{%- set image = build_image_name("kube-proxy") -%}

{%- set apiserver = 'https://127.0.0.1:7443' %}

Deploy kube-proxy (ServiceAccount):
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ServiceAccount
        metadata:
          name: kube-proxy
          namespace: kube-system

Deploy kube-proxy (ClusterRoleBinding):
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: ClusterRoleBinding
        metadata:
          name: kubeadm:node-proxier
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: ClusterRole
          name: system:node-proxier
        subjects:
        - kind: ServiceAccount
          name: kube-proxy
          namespace: kube-system
    - require:
      - metalk8s_kubernetes: Deploy kube-proxy (ServiceAccount)

Deploy kube-proxy (ConfigMap):
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: v1
        kind: ConfigMap
        metadata:
          name: kube-proxy
          namespace: kube-system
          labels:
            app: kube-proxy
        data:
          config.conf: |-
            apiVersion: kubeproxy.config.k8s.io/v1alpha1
            bindAddress: 0.0.0.0
            bindAddressHardFail: false
            clientConnection:
              acceptContentTypes: ""
              burst: 0
              contentType: ""
              kubeconfig: /var/lib/kube-proxy/kubeconfig.conf
              qps: 0
            clusterCIDR: {{ networks.pod }}
            configSyncPeriod: 0s
            conntrack:
              maxPerCore: null
              min: null
              tcpCloseWaitTimeout: null
              tcpEstablishedTimeout: null
            detectLocal:
              bridgeInterface: ""
              interfaceNamePrefix: ""
            detectLocalMode: ""
            enableProfiling: false
            healthzBindAddress: @HOST_IP@:10256
            hostnameOverride: ""
            iptables:
              masqueradeAll: false
              masqueradeBit: null
              minSyncPeriod: 0s
              syncPeriod: 0s
            ipvs:
              excludeCIDRs: null
              minSyncPeriod: 0s
              scheduler: ""
              strictARP: false
              syncPeriod: 0s
              tcpFinTimeout: 0s
              tcpTimeout: 0s
              udpTimeout: 0s
            kind: KubeProxyConfiguration
            metricsBindAddress: @HOST_IP@:10249
            mode: ""
            nodePortAddresses: {{ salt.metalk8s_network.get_nodeport_cidrs() | tojson }}
            oomScoreAdj: null
            portRange: ""
            showHiddenMetricsForVersion: ""
            udpIdleTimeout: 0s
            winkernel:
              enableDSR: false
              forwardHealthCheckVip: false
              networkName: ""
              sourceVip: ""
          kubeconfig.conf: |-
            apiVersion: v1
            kind: Config
            clusters:
            - cluster:
                certificate-authority: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
                server: {{ apiserver }}
              name: default
            contexts:
            - context:
                cluster: default
                namespace: default
                user: default
              name: default
            current-context: default
            users:
            - name: default
              user:
                tokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token


Deploy kube-proxy (DaemonSet):
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: apps/v1
        kind: DaemonSet
        metadata:
          name: kube-proxy
          namespace: kube-system
          labels:
            k8s-app: kube-proxy
        spec:
          selector:
            matchLabels:
              k8s-app: kube-proxy
          template:
            metadata:
              annotations:
                # NOTE: Add annotation for config checksum, so that Pod get restarted on
                # ConfigMap change
                checksum/config: __slot__:salt:metalk8s_kubernetes.get_object_digest(kind="ConfigMap",
                  apiVersion="v1", namespace="kube-system", name="kube-proxy", path="data")
              creationTimestamp: null
              labels:
                k8s-app: kube-proxy
            spec:
              initContainers:
              - name: generate-kube-proxy-config
                command:
                # NOTE: We need to use a sed here since overriding the bind addresses
                # from CLI is not supported
                # See: https://github.com/kubernetes/kubernetes/issues/108737
                - /bin/sh
                - -c
                - >-
                  sed "s/@HOST_IP@/$HOST_IP/g"
                  /var/lib/kube-proxy/config.conf > /etc/kube-proxy/config.conf
                image: {{ build_image_name("metalk8s-utils") }}
                env:
                - name: HOST_IP
                  valueFrom:
                    fieldRef:
                      apiVersion: v1
                      fieldPath: status.hostIP
                volumeMounts:
                - mountPath: /etc/kube-proxy
                  name: config
                - mountPath: /var/lib/kube-proxy
                  name: kube-proxy
              containers:
              - command:
                - /usr/local/bin/kube-proxy
                - --config=/etc/kube-proxy/config.conf
                - --hostname-override=$(NODE_NAME)
                - --v={{ 2 if metalk8s.debug else 0 }}
                env:
                - name: NODE_NAME
                  valueFrom:
                    fieldRef:
                      apiVersion: v1
                      fieldPath: spec.nodeName
                - name: HOST_IP
                  valueFrom:
                    fieldRef:
                      apiVersion: v1
                      fieldPath: status.hostIP
                image: {{ image }}
                imagePullPolicy: IfNotPresent
                name: kube-proxy
                resources: {}
                securityContext:
                  privileged: true
                volumeMounts:
                - mountPath: /var/lib/kube-proxy
                  name: kube-proxy
                - mountPath: /run/xtables.lock
                  name: xtables-lock
                - mountPath: /lib/modules
                  name: lib-modules
                  readOnly: true
                - mountPath: /etc/kube-proxy
                  name: config
              hostNetwork: true
              priorityClassName: system-node-critical
              serviceAccountName: kube-proxy
              tolerations:
              - key: CriticalAddonsOnly
                operator: Exists
              - operator: Exists
              volumes:
              - configMap:
                  name: kube-proxy
                name: kube-proxy
              - hostPath:
                  path: /run/xtables.lock
                  type: FileOrCreate
                name: xtables-lock
              - hostPath:
                  path: /lib/modules
                name: lib-modules
              - emptyDir: {}
                name: config
          updateStrategy:
            type: RollingUpdate
    - require:
      - metalk8s_kubernetes: Deploy kube-proxy (ServiceAccount)
      - metalk8s_kubernetes: Deploy kube-proxy (ClusterRoleBinding)
      - metalk8s_kubernetes: Deploy kube-proxy (ConfigMap)

Deploy kube-proxy (Role):
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: Role
        metadata:
          name: kube-proxy
          namespace: kube-system
        rules:
        - apiGroups:
          - ""
          resourceNames:
          - kube-proxy
          resources:
          - configmaps
          verbs:
          - get

Deploy kube-proxy (RoleBinding):
  metalk8s_kubernetes.object_present:
    - manifest:
        apiVersion: rbac.authorization.k8s.io/v1
        kind: RoleBinding
        metadata:
          name: kube-proxy
          namespace: kube-system
        roleRef:
          apiGroup: rbac.authorization.k8s.io
          kind: Role
          name: kube-proxy
        subjects:
        - kind: Group
          name: system:bootstrappers:kubeadm:default-node-token
    - require:
      - metalk8s_kubernetes: Deploy kube-proxy (Role)

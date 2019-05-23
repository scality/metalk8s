{%- from "metalk8s/repo/macro.sls" import kubernetes_image with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

{%- set image = kubernetes_image("kube-proxy") -%}

{%- set kubeconfig = "/etc/kubernetes/admin.conf" %}
{%- set context = "kubernetes-admin@kubernetes" %}

{#- TODO: Not always use local machine as apiserver #}
{%- set apiserver = 'https://' ~ grains['metalk8s']['control_plane_ip'] ~ ':6443' %}

Deploy kube-proxy (ServiceAccount):
  metalk8s_kubernetes.serviceaccount_present:
    - name: kube-proxy
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - namespace: kube-system

Deploy kube-proxy (ClusterRoleBinding):
  metalk8s_kubernetes.clusterrolebinding_present:
    - name: kubeadm:node-proxier
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - role_ref:
        apiGroup: rbac.authorization.k8s.io
        kind: ClusterRole
        name: system:node-proxier
    - subjects:
      - kind: ServiceAccount
        name: kube-proxy
        namespace: kube-system
    - require:
      - metalk8s_kubernetes: Deploy kube-proxy (ServiceAccount)

Deploy kube-proxy (ConfigMap):
  metalk8s_kubernetes.configmap_present:
    - name: kube-proxy
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - namespace: kube-system
    - labels:
        app: kube-proxy
    - data:
        config.conf: |-
          apiVersion: kubeproxy.config.k8s.io/v1alpha1
          bindAddress: 0.0.0.0
          clientConnection:
            acceptContentTypes: ""
            burst: 10
            contentType: application/vnd.kubernetes.protobuf
            kubeconfig: /var/lib/kube-proxy/kubeconfig.conf
            qps: 5
          clusterCIDR: {{ networks.pod }}
          configSyncPeriod: 15m0s
          conntrack:
            max: null
            maxPerCore: 32768
            min: 131072
            tcpCloseWaitTimeout: 1h0m0s
            tcpEstablishedTimeout: 24h0m0s
          enableProfiling: false
          healthzBindAddress: 0.0.0.0:10256
          hostnameOverride: ""
          iptables:
            masqueradeAll: false
            masqueradeBit: 14
            minSyncPeriod: 0s
            syncPeriod: 30s
          ipvs:
            excludeCIDRs: null
            minSyncPeriod: 0s
            scheduler: ""
            syncPeriod: 30s
          kind: KubeProxyConfiguration
          metricsBindAddress: 127.0.0.1:10249
          mode: ""
          nodePortAddresses:
          - {{ networks.workload_plane }}
          oomScoreAdj: -999
          portRange: ""
          resourceContainer: /kube-proxy
          udpIdleTimeout: 250ms
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
  metalk8s_kubernetes.daemonset_present:
    - name: kube-proxy
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - namespace: kube-system
    - metadata:
        labels:
          k8s-app: kube-proxy
    - spec:
        selector:
          matchLabels:
            k8s-app: kube-proxy
        template:
          metadata:
            annotations:
              scheduler.alpha.kubernetes.io/critical-pod: ""
            creationTimestamp: null
            labels:
              k8s-app: kube-proxy
          spec:
            containers:
            - command:
              - /usr/local/bin/kube-proxy
              - --config=/var/lib/kube-proxy/config.conf
              - --hostname-override=$(NODE_NAME)
              env:
              - name: NODE_NAME
                valueFrom:
                  fieldRef:
                    apiVersion: v1
                    fieldPath: spec.nodeName
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
        updateStrategy:
          type: RollingUpdate
    - require:
      - metalk8s_kubernetes: Deploy kube-proxy (ServiceAccount)
      - metalk8s_kubernetes: Deploy kube-proxy (ClusterRoleBinding)
      - metalk8s_kubernetes: Deploy kube-proxy (ConfigMap)

Deploy kube-proxy (Role):
  metalk8s_kubernetes.role_present:
    - name: kube-proxy
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - namespace: kube-system
    - rules:
      - apiGroups:
        - ""
        resourceNames:
        - kube-proxy
        resources:
        - configmaps
        verbs:
        - get

Deploy kube-proxy (RoleBinding):
  metalk8s_kubernetes.rolebinding_present:
    - name: kube-proxy
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - namespace: kube-system
    - role_ref:
        apiGroup: rbac.authorization.k8s.io
        kind: Role
        name: kube-proxy
    - subjects:
      - kind: Group
        name: system:bootstrappers:kubeadm:default-node-token
    - require:
      - metalk8s_kubernetes: Deploy kube-proxy (Role)

{%- from "metalk8s/registry/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

{%- set image = build_image_name("calico-node", "3.5.1") -%}

{% set kubeconfig = "/etc/kubernetes/admin.conf" %}
{% set context = "kubernetes-admin@kubernetes" %}

Deploy calico-config (ConfigMap):
  kubernetes.configmap_present:
    - name: calico-config
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - namespace: kube-system
    - data:
        typha_service_name: "none"
        calico_backend: "bird"
        veth_mtu: 1440

Deploy calico-node (DaemonSet):
  kubernetes.daemonset_present:
    - name: calico-node
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - namespace: kube-system
    - metadata:
        labels:
          k8s-app: calico-node
    - spec:
        selector:
          matchLabels:
            k8s-app: calico-node
        updateStrategy:
          type: RollingUpdate
          rollingUpdate:
            maxUnavailable: 1
        template:
          metadata:
            labels:
              k8s-app: calico-node
            annotation:
              scheduler.alpha.kubernetes.io/critical-pod: ''
          spec:
            nodeSelector:
              beta.kubernetes.io/os: linux
            hostNetwork: true
            tolerations:
              - effect: NoSchedule
                operator: Exists
              - key: CriticalAddonsOnly
                operator: Exists
              - effect: NoExecute
                operator: Exists
            serviceAccountName: calico-node
            terminationGracePeriodSeconds: 0
            containers:
              - name: calico-node
                image: {{ image }}
                env:
                  - name: DATASTORE_TYPE
                    value: "kubernetes"
                  - name: WAIT_FOR_DATASTORE
                    value: "true"
                  - name: NODENAME
                    valueFrom:
                      fieldRef:
                        fieldPath: spec.nodeName
                  - name: CALICO_NETWORKING_BACKEND
                    valueFrom:
                      configMapKeyRef:
                        name: calico-config
                        key: calico_backend
                  - name: CLUSTER_TYPE
                    value: "k8s,bgp"
                  - name: IP
                    value: "autodetect"
                  - name: CALICO_IPV4POOL_IPIP
                    value: "Always"
                  - name: FELIX_IPINIPMTU
                    valueFrom:
                      configMapKeyRef:
                        name: calico-config
                        key: veth_mtu
                  - name: CALICO_IPV4POOL_CIDR
                    value: {{ networks.pod }}
                  - name: CALICO_DISABLE_FILE_LOGGING
                    value: "true"
                  - name: FELIX_DEFAULTENDPOINTTOHOSTACTION
                    value: "ACCEPT"
                  - name: FELIX_IPV6SUPPORT
                    value: "false"
                  - name: FELIX_LOGSEVERITYSCREEN
                    value: "info"
                  - name: FELIX_HEALTHENABLED
                    value: "true"
                securityContext:
                  privileged: true
                resources:
                  requests:
                    cpu: 250m
                livenessProbe:
                  httpGet:
                    path: /liveness
                    port: 9099
                    host: localhost
                  periodSeconds: 10
                  initialDelaySeconds: 10
                  failureThreshold: 6
                readinessProbe:
                  exec:
                    command:
                    - /bin/calico-node
                    - -bird-ready
                    - -felix-ready
                  periodSeconds: 10
                volumeMounts:
                  - mountPath: /lib/modules
                    name: lib-modules
                    readOnly: true
                  - mountPath: /run/xtables.lock
                    name: xtables-lock
                    readOnly: false
                  - mountPath: /var/run/calico
                    name: var-run-calico
                    readOnly: false
                  - mountPath: /var/lib/calico
                    name: var-lib-calico
                    readOnly: false
            volumes:
              - name: lib-modules
                hostPath:
                  path: /lib/modules
              - name: var-run-calico
                hostPath:
                  path: /var/run/calico
              - name: var-lib-calico
                hostPath:
                  path: /var/lib/calico
              - name: xtables-lock
                hostPath:
                  path: /run/xtables.lock
                  type: FileOrCreate
    - require:
        - kubernetes: Deploy calico-config (ConfigMap)

Deploy calico-node (ServiceAccount):
  kubernetes.serviceaccount_present:
    - name: calico-node
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - namespace: kube-system

Deploy calico-node (ClusterRoleBinding):
  kubernetes.clusterrolebinding_present:
    - name: calico-node
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - role_ref:
        apiGroup: rbac.authorization.k8s.io
        kind: ClusterRole
        name: calico-node
    - subjects:
      - kind: ServiceAccount
        name: calico-node
        namespace: kube-system
      - apiGroup: rbac.authorization.k8s.io
        kind: Group
        name: metalk8s:calico-node
    - require:
      - kubernetes: Deploy calico-node (ClusterRole)
      - kubernetes: Deploy calico-node (ServiceAccount)

Deploy felixconfigurations.crd.projectcalico.org (CustomResourceDefinition):
  kubernetes.customresourcedefinition_present:
    - name: felixconfigurations.crd.projectcalico.org
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - spec:
        scope: Cluster
        group: crd.projectcalico.org
        version: v1
        names:
          kind: FelixConfiguration
          plural: felixconfigurations
          singular: felixconfiguration
    - require_in:
      - kubernetes: Deploy calico-node (ClusterRole)

Deploy bgppeers.crd.projectcalico.org (CustomResourceDefinition):
  kubernetes.customresourcedefinition_present:
    - name: bgppeers.crd.projectcalico.org
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - spec:
        scope: Cluster
        group: crd.projectcalico.org
        version: v1
        names:
          kind: BGPPeer
          plural: bgppeers
          singular: bgppeer
    - require_in:
      - kubernetes: Deploy calico-node (ClusterRole)

Deploy bgpconfigurations.crd.projectcalico.org (CustomResourceDefinition):
  kubernetes.customresourcedefinition_present:
    - name: bgpconfigurations.crd.projectcalico.org
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - spec:
        scope: Cluster
        group: crd.projectcalico.org
        version: v1
        names:
          kind: BGPConfiguration
          plural: bgpconfigurations
          singular: bgpconfiguration
    - require_in:
      - kubernetes: Deploy calico-node (ClusterRole)

Deploy ippools.crd.projectcalico.org (CustomResourceDefinition):
  kubernetes.customresourcedefinition_present:
    - name: ippools.crd.projectcalico.org
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - spec:
        scope: Cluster
        group: crd.projectcalico.org
        version: v1
        names:
          kind: IPPool
          plural: ippools
          singular: ippool
    - require_in:
      - kubernetes: Deploy calico-node (ClusterRole)

Deploy hostendpoints.crd.projectcalico.org (CustomResourceDefinition):
  kubernetes.customresourcedefinition_present:
    - name: hostendpoints.crd.projectcalico.org
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - spec:
        scope: Cluster
        group: crd.projectcalico.org
        version: v1
        names:
          kind: HostEndpoint
          plural: hostendpoints
          singular: hostendpoint
    - require_in:
      - kubernetes: Deploy calico-node (ClusterRole)

Deploy clusterinformations.crd.projectcalico.org (CustomResourceDefinition):
  kubernetes.customresourcedefinition_present:
    - name: clusterinformations.crd.projectcalico.org
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - spec:
        scope: Cluster
        group: crd.projectcalico.org
        version: v1
        names:
          kind: ClusterInformation
          plural: clusterinformations
          singular: clusterinformation
    - require_in:
      - kubernetes: Deploy calico-node (ClusterRole)

Deploy globalnetworkpolicies.crd.projectcalico.org (CustomResourceDefinition):
  kubernetes.customresourcedefinition_present:
    - name: globalnetworkpolicies.crd.projectcalico.org
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - spec:
        scope: Cluster
        group: crd.projectcalico.org
        version: v1
        names:
          kind: GlobalNetworkPolicy
          plural: globalnetworkpolicies
          singular: globalnetworkpolicy
    - require_in:
      - kubernetes: Deploy calico-node (ClusterRole)

Deploy globalnetworksets.crd.projectcalico.org (CustomResourceDefinition):
  kubernetes.customresourcedefinition_present:
    - name: globalnetworksets.crd.projectcalico.org
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - spec:
        scope: Cluster
        group: crd.projectcalico.org
        version: v1
        names:
          kind: GlobalNetworkSet
          plural: globalnetworksets
          singular: globalnetworkset
    - require_in:
      - kubernetes: Deploy calico-node (ClusterRole)

Deploy networkpolicies.crd.projectcalico.org (CustomResourceDefinition):
  kubernetes.customresourcedefinition_present:
    - name: networkpolicies.crd.projectcalico.org
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - spec:
        scope: Namespaced
        group: crd.projectcalico.org
        version: v1
        names:
          kind: NetworkPolicy
          plural: networkpolicies
          singular: networkpolicy
    - require_in:
      - kubernetes: Deploy calico-node (ClusterRole)

Deploy calico-node (ClusterRole):
  kubernetes.clusterrole_present:
    - name: calico-node
    - kubeconfig: {{ kubeconfig }}
    - context: {{ context }}
    - rules:
      - apiGroups:
          - ""
        resources:
          - pods
          - nodes
          - namespaces
        verbs:
          - get
      - apiGroups:
          - ""
        resources:
          - endpoints
          - services
        verbs:
          - watch
          - list
          - get
      - apiGroups:
          - ""
        resources:
          - nodes/status
        verbs:
          - patch
          - update
      - apiGroups:
          - "networking.k8s.io"
        resources:
          - networkpolicies
        verbs:
          - watch
          - list
      - apiGroups:
          - ""
        resources:
          - pods
          - namespaces
          - serviceaccounts
        verbs:
          - list
          - watch
      - apiGroups:
          - ""
        resources:
          - pods/status
        verbs:
          - patch
      - apiGroups:
          - "crd.projectcalico.org"
        resources:
          - globalfelixconfigs
          - felixconfigurations
          - bgppeers
          - globalbgpconfigs
          - bgpconfigurations
          - ippools
          - globalnetworkpolicies
          - globalnetworksets
          - networkpolicies
          - clusterinformations
          - hostendpoints
        verbs:
          - get
          - list
          - watch
      - apiGroups:
          - "crd.projectcalico.org"
        resources:
          - ippools
          - felixconfigurations
          - clusterinformations
        verbs:
          - create
          - update
      - apiGroups:
          - ""
        resources:
          - nodes
        verbs:
          - get
          - list
          - watch
      - apiGroups:
          - "crd.projectcalico.org"
        resources:
          - bgpconfigurations
          - bgppeers
        verbs:
          - create
          - update

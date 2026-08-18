#!jinja | metalk8s_kubernetes
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- raw %}
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.18.0
  name: discoveredphysicaldisks.metalk8s.scality.com
spec:
  group: metalk8s.scality.com
  names:
    kind: DiscoveredPhysicalDisk
    listKind: DiscoveredPhysicalDiskList
    plural: discoveredphysicaldisks
    singular: discoveredphysicaldisk
  scope: Cluster
  versions:
  - additionalPrinterColumns:
    - jsonPath: .spec.id
      name: ID
      type: string
    - jsonPath: .spec.nodeName
      name: Node
      type: string
    - jsonPath: .status.available
      name: Available
      type: boolean
    - jsonPath: .status.type
      name: Type
      type: string
    - jsonPath: .status.size
      name: Size
      type: integer
    - jsonPath: .status.status
      name: Status
      type: string
    name: v1alpha1
    schema:
      openAPIV3Schema:
        description: DiscoveredPhysicalDisk is the Schema for the discoveredphysicaldisks
          API.
        properties:
          apiVersion:
            description: |-
              APIVersion defines the versioned schema of this representation of an object.
              Servers should convert recognized schemas to the latest internal value, and
              may reject unrecognized values.
              More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources
            type: string
          kind:
            description: |-
              Kind is a string value representing the REST resource this object represents.
              Servers may infer this from the endpoint the client submits requests to.
              Cannot be updated.
              In CamelCase.
              More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds
            type: string
          metadata:
            type: object
          spec:
            description: |-
              DiscoveredPhysicalDiskSpec defines the desired state of DiscoveredPhysicalDisk.
              It contains only immutable slot identifiers set at creation time.
            properties:
              controller:
                description: Controller identifies the RAID controller managing this
                  disk.
                properties:
                  id:
                    description: ID is the controller index.
                    type: integer
                  type:
                    description: Type is the controller type (e.g. "MegaRAID").
                    type: string
                required:
                - id
                - type
                type: object
              id:
                description: ID is the disk identifier as reported by the controller
                  (e.g. "0:1:2").
                type: string
              nodeName:
                description: NodeName is the name of the node where this disk was
                  discovered.
                type: string
              slot:
                description: Slot describes the physical slot location of the disk.
                properties:
                  bay:
                    description: Bay is the bay number.
                    type: string
                  enclosure:
                    description: Enclosure is the enclosure number.
                    type: string
                  port:
                    description: Port is the port number.
                    type: string
                required:
                - bay
                - enclosure
                - port
                type: object
            required:
            - controller
            - id
            - nodeName
            - slot
            type: object
          status:
            description: DiscoveredPhysicalDiskStatus defines the observed state of
              DiscoveredPhysicalDisk.
            properties:
              available:
                description: Available indicates whether the physical drive is present
                  in the slot.
                type: boolean
              devicePath:
                description: DevicePath is the OS device path (e.g. "/dev/sda").
                type: string
              jbod:
                description: JBOD indicates whether the disk is in JBOD (passthrough)
                  mode.
                type: boolean
              model:
                description: Model is the disk model name.
                type: string
              permanentPath:
                description: PermanentPath is the stable device path (e.g. "/dev/disk/by-id/wwn-0x...").
                type: string
              reason:
                description: Reason provides additional context for the current status.
                type: string
              serial:
                description: Serial is the disk serial number.
                type: string
              size:
                description: Size is the disk capacity in bytes.
                format: int64
                type: integer
              status:
                description: Status is the current disk status.
                type: string
              type:
                description: Type is the disk media type.
                enum:
                - HDD
                - SSD
                - NVMe
                type: string
              vendor:
                description: Vendor is the disk manufacturer.
                type: string
              wwn:
                description: WWN is the World Wide Name of the disk.
                type: string
            type: object
        type: object
    selectableFields:
    - jsonPath: .spec.nodeName
    served: true
    storage: true
    subresources:
      status: {}
---
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: disk-management-agent
  name: disk-management-agent-controller-manager
  namespace: metalk8s-storage-management
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: disk-management-agent
  name: disk-management-agent-discoveredphysicaldisk-admin-role
rules:
- apiGroups:
  - metalk8s.scality.com
  resources:
  - discoveredphysicaldisks
  verbs:
  - '*'
- apiGroups:
  - metalk8s.scality.com
  resources:
  - discoveredphysicaldisks/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: disk-management-agent
  name: disk-management-agent-discoveredphysicaldisk-editor-role
rules:
- apiGroups:
  - metalk8s.scality.com
  resources:
  - discoveredphysicaldisks
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - metalk8s.scality.com
  resources:
  - discoveredphysicaldisks/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: disk-management-agent
  name: disk-management-agent-discoveredphysicaldisk-viewer-role
rules:
- apiGroups:
  - metalk8s.scality.com
  resources:
  - discoveredphysicaldisks
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - metalk8s.scality.com
  resources:
  - discoveredphysicaldisks/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: disk-management-agent-manager-role
rules:
- apiGroups:
  - metalk8s.scality.com
  resources:
  - discoveredphysicaldisks
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - metalk8s.scality.com
  resources:
  - discoveredphysicaldisks/finalizers
  verbs:
  - update
- apiGroups:
  - metalk8s.scality.com
  resources:
  - discoveredphysicaldisks/status
  verbs:
  - get
  - patch
  - update
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: disk-management-agent-metrics-auth-role
rules:
- apiGroups:
  - authentication.k8s.io
  resources:
  - tokenreviews
  verbs:
  - create
- apiGroups:
  - authorization.k8s.io
  resources:
  - subjectaccessreviews
  verbs:
  - create
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: disk-management-agent-metrics-reader
rules:
- nonResourceURLs:
  - /metrics
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: disk-management-agent
  name: disk-management-agent-manager-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: disk-management-agent-manager-role
subjects:
- kind: ServiceAccount
  name: disk-management-agent-controller-manager
  namespace: metalk8s-storage-management
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: disk-management-agent-metrics-auth-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: disk-management-agent-metrics-auth-role
subjects:
- kind: ServiceAccount
  name: disk-management-agent-controller-manager
  namespace: metalk8s-storage-management
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: disk-management-agent
    control-plane: controller-manager
  name: disk-management-agent-metrics-service
  namespace: metalk8s-storage-management
spec:
  ports:
  - name: https
    port: 8443
    protocol: TCP
    targetPort: 8443
  selector:
    app.kubernetes.io/name: disk-management-agent
    control-plane: controller-manager
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: disk-management-agent
  name: disk-management-agent-webhook-service
  namespace: metalk8s-storage-management
spec:
  ports:
  - port: 443
    protocol: TCP
    targetPort: 9443
  selector:
    app.kubernetes.io/name: disk-management-agent
    control-plane: controller-manager
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: disk-management-agent
    control-plane: controller-manager
  name: disk-management-agent-controller-manager
  namespace: metalk8s-storage-management
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: disk-management-agent
      control-plane: controller-manager
  template:
    metadata:
      annotations:
        kubectl.kubernetes.io/default-container: manager
      labels:
        app.kubernetes.io/name: disk-management-agent
        control-plane: controller-manager
    spec:
      containers:
      - args:
        - --metrics-bind-address=:8443
        - --health-probe-bind-address=:8081
        - --webhook-cert-path=/tmp/k8s-webhook-server/serving-certs
        command:
        - /manager
        env:
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: POD_SERVICE_ACCOUNT
          valueFrom:
            fieldRef:
              fieldPath: spec.serviceAccountName
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: STORCLI_PATH
          value: /host/libexec/MegaRAID/storcli/storcli64
        - name: PERCCLI_PATH
          value: /host/libexec/MegaRAID/perccli/perccli64
        - name: STORCLI2_PATH
          value: /host/libexec/MegaRAID/storcli2/storcli2
        - name: PERCCLI2_PATH
          value: /host/libexec/MegaRAID/perccli2/perccli2
        - name: SSACLI_PATH
          value: /host/libexec/ssacli
        image: '{% endraw -%}{{ build_image_name("disk-management-agent", False) }}{%-
          raw %}:v0.1.0'
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8081
          initialDelaySeconds: 15
          periodSeconds: 20
        name: manager
        ports:
        - containerPort: 9443
          name: webhook-server
          protocol: TCP
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          limits:
            cpu: 500m
            memory: 128Mi
          requests:
            cpu: 10m
            memory: 64Mi
        securityContext:
          privileged: true
          runAsUser: 0
        volumeMounts:
        - mountPath: /host/libexec/MegaRAID
          name: megaraid
          readOnly: true
        - mountPath: /host/libexec/ssacli
          name: ssacli
          readOnly: true
        - mountPath: /dev
          name: dev
        - mountPath: /tmp/k8s-webhook-server/serving-certs
          name: webhook-certs
          readOnly: true
      securityContext:
        runAsNonRoot: false
        seccompProfile:
          type: RuntimeDefault
      serviceAccountName: disk-management-agent-controller-manager
      terminationGracePeriodSeconds: 10
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/master
        operator: Exists
      volumes:
      - hostPath:
          path: /opt/MegaRAID/
          type: DirectoryOrCreate
        name: megaraid
      - hostPath:
          path: /usr/bin/ssacli
          type: FileOrCreate
        name: ssacli
      - hostPath:
          path: /dev
          type: Directory
        name: dev
      - name: webhook-certs
        secret:
          secretName: webhook-server-cert
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: disk-management-agent
  name: disk-management-agent-metrics-certs
  namespace: metalk8s-storage-management
spec:
  dnsNames:
  - disk-management-agent-metrics-service.metalk8s-storage-management.svc
  - disk-management-agent-metrics-service.metalk8s-storage-management.svc.cluster.local
  issuerRef:
    kind: Issuer
    name: disk-management-agent-selfsigned-issuer
  secretName: metrics-server-cert
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: disk-management-agent
  name: disk-management-agent-serving-cert
  namespace: metalk8s-storage-management
spec:
  dnsNames:
  - disk-management-agent-webhook-service.metalk8s-storage-management.svc
  - disk-management-agent-webhook-service.metalk8s-storage-management.svc.cluster.local
  issuerRef:
    kind: Issuer
    name: disk-management-agent-selfsigned-issuer
  secretName: webhook-server-cert
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: disk-management-agent
  name: disk-management-agent-selfsigned-issuer
  namespace: metalk8s-storage-management
spec:
  selfSigned: {}
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  annotations:
    cert-manager.io/inject-ca-from: metalk8s-storage-management/disk-management-agent-serving-cert
  name: disk-management-agent-validating-webhook-configuration
webhooks:
- admissionReviewVersions:
  - v1
  clientConfig:
    service:
      name: disk-management-agent-webhook-service
      namespace: metalk8s-storage-management
      path: /validate-metalk8s-scality-com-v1alpha1-discoveredphysicaldisk
  failurePolicy: Fail
  name: vdiscoveredphysicaldisk-v1alpha1.kb.io
  rules:
  - apiGroups:
    - metalk8s.scality.com
    apiVersions:
    - v1alpha1
    operations:
    - CREATE
    - UPDATE
    resources:
    - discoveredphysicaldisks
  sideEffects: None
{%- endraw %}

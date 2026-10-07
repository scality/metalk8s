#!jinja | metalk8s_kubernetes
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- raw %}
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.21.0
  name: imagecaches.image-cache.scality.com
spec:
  group: image-cache.scality.com
  names:
    kind: ImageCache
    listKind: ImageCacheList
    plural: imagecaches
    singular: imagecache
  scope: Cluster
  versions:
  - additionalPrinterColumns:
    - jsonPath: .spec.source
      name: Source
      type: string
    - jsonPath: .metadata.creationTimestamp
      name: Age
      type: date
    name: v1alpha1
    schema:
      openAPIV3Schema:
        description: |-
          ImageCache declares desired boot-cache content for a set of nodes. The
          agent reports per-node sync status through node labels
          (image-cache.scality.com/<name>: synced|pending), so the resource name
          should be chosen up front: metadata.generateName is discouraged.
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
            description: spec defines the desired state of ImageCache
            properties:
              nodeSelector:
                additionalProperties:
                  type: string
                description: |-
                  nodeSelector selects the nodes this cache applies to, by exact
                  key/value match against node labels (same semantics as a pod's
                  .spec.nodeSelector). Empty or absent selects every node.
                type: object
              source:
                description: |-
                  source is the reference of the image whose layers contain the
                  tarballs to cache. The reference uses the usual
                  registry/repository[:tag|@digest] form; the registry may carry a port,
                  the repository is lowercase, and a digest is sha256.
                  The length bound is what keeps the CEL rule below the API server's
                  per-rule cost budget, which is computed from the declared maximum.
                maxLength: 512
                minLength: 1
                type: string
                x-kubernetes-validations:
                - message: source must be a container image reference, of the form
                    registry[:port]/repository[:tag][@sha256:<digest>]
                  rule: self.matches('^([a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]+)?/)?[a-z0-9]+([._-][a-z0-9]+)*(/[a-z0-9]+([._-][a-z0-9]+)*)*(:[a-zA-Z0-9_][a-zA-Z0-9._-]*)?(@sha256:[a-f0-9]{64})?$')
            required:
            - source
            type: object
        required:
        - spec
        type: object
        x-kubernetes-validations:
        - message: 'name must not exceed 63 characters: it is used as a node label
            name'
          rule: size(self.metadata.name) <= 63
    served: true
    storage: true
    subresources: {}
---
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: image-cache-agent
  name: image-cache-agent-controller-manager
  namespace: metalk8s-image-cache
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: image-cache-agent
  name: image-cache-agent-imagecache-admin-role
rules:
- apiGroups:
  - image-cache.scality.com
  resources:
  - imagecaches
  verbs:
  - '*'
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: image-cache-agent
  name: image-cache-agent-imagecache-editor-role
rules:
- apiGroups:
  - image-cache.scality.com
  resources:
  - imagecaches
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: image-cache-agent
  name: image-cache-agent-imagecache-viewer-role
rules:
- apiGroups:
  - image-cache.scality.com
  resources:
  - imagecaches
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: image-cache-agent-manager-role
rules:
- apiGroups:
  - ""
  resources:
  - nodes
  verbs:
  - get
  - list
  - patch
  - watch
- apiGroups:
  - events.k8s.io
  resources:
  - events
  verbs:
  - create
  - patch
- apiGroups:
  - image-cache.scality.com
  resources:
  - imagecaches
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: image-cache-agent-metrics-auth-role
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
  name: image-cache-agent-metrics-reader
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
    app.kubernetes.io/name: image-cache-agent
  name: image-cache-agent-manager-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: image-cache-agent-manager-role
subjects:
- kind: ServiceAccount
  name: image-cache-agent-controller-manager
  namespace: metalk8s-image-cache
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: image-cache-agent-metrics-auth-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: image-cache-agent-metrics-auth-role
subjects:
- kind: ServiceAccount
  name: image-cache-agent-controller-manager
  namespace: metalk8s-image-cache
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: image-cache-agent
    control-plane: controller-manager
  name: image-cache-agent-controller-manager-metrics-service
  namespace: metalk8s-image-cache
spec:
  ports:
  - name: https
    port: 8443
    protocol: TCP
    targetPort: 8443
  selector:
    app.kubernetes.io/name: image-cache-agent
    control-plane: controller-manager
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: image-cache-agent
    control-plane: controller-manager
  name: image-cache-agent-controller-manager
  namespace: metalk8s-image-cache
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: image-cache-agent
      control-plane: controller-manager
  template:
    metadata:
      annotations:
        kubectl.kubernetes.io/default-container: manager
      labels:
        app.kubernetes.io/name: image-cache-agent
        control-plane: controller-manager
    spec:
      containers:
      - args:
        - --metrics-bind-address=:8443
        - --health-probe-bind-address=:8081
        command:
        - /manager
        env:
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        image: '{% endraw -%}{{ build_image_name("image-cache-agent", False) }}{%-
          raw %}:v0.1.0-alpha.1-61-g6514034'
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8081
          initialDelaySeconds: 15
          periodSeconds: 20
        name: manager
        ports:
        - containerPort: 8081
          name: health
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
          allowPrivilegeEscalation: false
          capabilities:
            add:
            - DAC_OVERRIDE
            drop:
            - ALL
          readOnlyRootFilesystem: true
        volumeMounts:
        - mountPath: /var/lib/image-cache
          name: image-cache
      nodeSelector:
        kubernetes.io/arch: amd64
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      serviceAccountName: image-cache-agent-controller-manager
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
      - effect: NoSchedule
        key: node-role.kubernetes.io/etcd
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/control-plane
        operator: Exists
      volumes:
      - hostPath:
          path: /var/lib/image-cache
          type: DirectoryOrCreate
        name: image-cache
{%- endraw %}

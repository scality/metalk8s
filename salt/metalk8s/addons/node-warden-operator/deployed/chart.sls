#!jinja | metalk8s_kubernetes
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- raw %}
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.21.0
  name: noderemediationpolicies.warden.scality.com
spec:
  group: warden.scality.com
  names:
    kind: NodeRemediationPolicy
    listKind: NodeRemediationPolicyList
    plural: noderemediationpolicies
    shortNames:
    - nrp
    singular: noderemediationpolicy
  scope: Cluster
  versions:
  - additionalPrinterColumns:
    - jsonPath: .spec.condition.type
      name: Condition
      type: string
    - jsonPath: .status.matchedCount
      name: Matched
      type: integer
    - jsonPath: .status.remediatedCount
      name: Remediated
      type: integer
    - jsonPath: .status.unknownCount
      name: Unknown
      type: integer
    - jsonPath: .status.selectedCount
      name: Selected
      priority: 1
      type: integer
    - jsonPath: .status.pendingCount
      name: Pending
      priority: 1
      type: integer
    - jsonPath: .status.heldCount
      name: Held
      priority: 1
      type: integer
    - jsonPath: .metadata.creationTimestamp
      name: Age
      type: date
    name: v1alpha1
    schema:
      openAPIV3Schema:
        description: NodeRemediationPolicy is the Schema for the noderemediationpolicies
          API
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
            description: spec defines the desired state of NodeRemediationPolicy
            properties:
              condition:
                description: condition is the node condition that triggers remediation.
                properties:
                  status:
                    default: "True"
                    description: status is the condition status that triggers remediation.
                    enum:
                    - "True"
                    - "False"
                    - Unknown
                    type: string
                  type:
                    description: type is the node condition type to watch (for example,
                      one set by a node problem detector).
                    minLength: 1
                    type: string
                required:
                - type
                type: object
              debounce:
                description: debounce sets how long the condition must be stable before
                  applying or removing the remediation.
                properties:
                  enter:
                    default: 60s
                    description: enter is how long the condition must hold before
                      the remediation is applied.
                    type: string
                  exit:
                    default: 30s
                    description: exit is how long the condition must be clear before
                      the remediation is removed.
                    type: string
                type: object
                x-kubernetes-validations:
                - message: debounce.enter and debounce.exit must be a non-negative
                    Go duration (e.g. 60s, 1h30m, 500ms)
                  rule: (!has(self.enter) || self.enter.matches('^(([0-9]{1,6}([.][0-9]+)?|[.][0-9]+)(ns|us|µs|ms|s|m|h))+$'))
                    && (!has(self.exit) || self.exit.matches('^(([0-9]{1,6}([.][0-9]+)?|[.][0-9]+)(ns|us|µs|ms|s|m|h))+$'))
              guard:
                description: guard limits how many nodes a single policy may remediate
                  at once.
                properties:
                  maxAffectedPercent:
                    default: 100
                    description: |-
                      maxAffectedPercent is evaluated over the selected nodes that report a determinate condition
                      (Unknown or unreported nodes are excluded); if the percentage of matched nodes exceeds it, no
                      node is remediated. Defaults to 100 (guard off).
                    format: int32
                    maximum: 100
                    minimum: 0
                    type: integer
                type: object
              nodeSelector:
                description: nodeSelector scopes the policy to a subset of nodes (empty
                  = all nodes).
                properties:
                  matchExpressions:
                    description: matchExpressions is a list of label selector requirements.
                      The requirements are ANDed.
                    items:
                      description: |-
                        A label selector requirement is a selector that contains values, a key, and an operator that
                        relates the key and values.
                      properties:
                        key:
                          description: key is the label key that the selector applies
                            to.
                          type: string
                        operator:
                          description: |-
                            operator represents a key's relationship to a set of values.
                            Valid operators are In, NotIn, Exists and DoesNotExist.
                          type: string
                        values:
                          description: |-
                            values is an array of string values. If the operator is In or NotIn,
                            the values array must be non-empty. If the operator is Exists or DoesNotExist,
                            the values array must be empty. This array is replaced during a strategic
                            merge patch.
                          items:
                            type: string
                          type: array
                          x-kubernetes-list-type: atomic
                      required:
                      - key
                      - operator
                      type: object
                    type: array
                    x-kubernetes-list-type: atomic
                  matchLabels:
                    additionalProperties:
                      type: string
                    description: |-
                      matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                      map is equivalent to an element of matchExpressions, whose key field is "key", the
                      operator is "In", and the values array contains only "value". The requirements are ANDed.
                    type: object
                type: object
                x-kubernetes-map-type: atomic
              remediations:
                description: remediations lists the remediations to apply to a matched
                  node; v1 supports taint.
                properties:
                  taint:
                    description: |-
                      taint applied to matched nodes; effect must be a real Kubernetes taint effect. NoExecute
                      also evicts non-tolerating pods and drops the node from Service endpoints; NoSchedule and
                      PreferNoSchedule only keep new pods off the node. The taint is reversible and removed when
                      the condition clears.
                      key is a valid Kubernetes qualified name: a name of at most 63 characters, optionally prefixed
                      with a DNS subdomain and a slash (for example, node.example.com/unreachable).
                      value, when set, is a valid Kubernetes label value (at most 63 characters).
                      The taint is immutable once set; delete and recreate the policy to change it.
                    properties:
                      effect:
                        description: |-
                          Required. The effect of the taint on pods
                          that do not tolerate the taint.
                          Valid effects are NoSchedule, PreferNoSchedule and NoExecute.
                        type: string
                      key:
                        description: Required. The taint key to be applied to a node.
                        type: string
                      timeAdded:
                        description: TimeAdded represents the time at which the taint
                          was added.
                        format: date-time
                        type: string
                      value:
                        description: The taint value corresponding to the taint key.
                        type: string
                    required:
                    - effect
                    - key
                    type: object
                    x-kubernetes-validations:
                    - message: taint.effect must be one of NoSchedule, PreferNoSchedule,
                        NoExecute
                      rule: self.effect in ['NoSchedule','PreferNoSchedule','NoExecute']
                    - message: taint.key must be a valid Kubernetes qualified name
                        (name <=63 chars, optional DNS-subdomain prefix)
                      rule: self.key.matches('^([a-z0-9]([-a-z0-9]*[a-z0-9])?([.][a-z0-9]([-a-z0-9]*[a-z0-9])?)*/)?[A-Za-z0-9]([-A-Za-z0-9_.]{0,61}[A-Za-z0-9])?$')
                        && self.key.size() <= 317
                    - message: taint.value must be empty or a valid Kubernetes label
                        value (<=63 chars)
                      rule: '!has(self.value) || self.value.matches(''^([A-Za-z0-9]([-A-Za-z0-9_.]{0,61}[A-Za-z0-9])?)?$'')'
                    - message: taint is immutable; delete and recreate the policy
                        to change it
                      rule: self == oldSelf
                type: object
                x-kubernetes-validations:
                - message: at least one remediation must be set (v1 supports 'taint')
                  rule: has(self.taint)
            required:
            - condition
            - remediations
            type: object
          status:
            description: status defines the observed state of NodeRemediationPolicy
            properties:
              conditions:
                description: conditions represents the observations of the policy
                  state (e.g. the Remediating condition).
                items:
                  description: Condition contains details for one aspect of the current
                    state of this API Resource.
                  properties:
                    lastTransitionTime:
                      description: |-
                        lastTransitionTime is the last time the condition transitioned from one status to another.
                        This should be when the underlying condition changed.  If that is not known, then using the time when the API field changed is acceptable.
                      format: date-time
                      type: string
                    message:
                      description: |-
                        message is a human readable message indicating details about the transition.
                        This may be an empty string.
                      maxLength: 32768
                      type: string
                    observedGeneration:
                      description: |-
                        observedGeneration represents the .metadata.generation that the condition was set based upon.
                        For instance, if .metadata.generation is currently 12, but the .status.conditions[x].observedGeneration is 9, the condition is out of date
                        with respect to the current state of the instance.
                      format: int64
                      minimum: 0
                      type: integer
                    reason:
                      description: |-
                        reason contains a programmatic identifier indicating the reason for the condition's last transition.
                        Producers of specific condition types may define expected values and meanings for this field,
                        and whether the values are considered a guaranteed API.
                        The value should be a CamelCase string.
                        This field may not be empty.
                      maxLength: 1024
                      minLength: 1
                      pattern: ^[A-Za-z]([A-Za-z0-9_,:]*[A-Za-z0-9_])?$
                      type: string
                    status:
                      description: status of the condition, one of True, False, Unknown.
                      enum:
                      - "True"
                      - "False"
                      - Unknown
                      type: string
                    type:
                      description: type of condition in CamelCase or in foo.example.com/CamelCase.
                      maxLength: 316
                      pattern: ^([a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*/)?(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])$
                      type: string
                  required:
                  - lastTransitionTime
                  - message
                  - reason
                  - status
                  - type
                  type: object
                type: array
                x-kubernetes-list-map-keys:
                - type
                x-kubernetes-list-type: map
              heldCount:
                description: heldCount is the number of matched nodes held for a missing
                  lastTransitionTime.
                format: int32
                type: integer
              heldNodes:
                description: |-
                  heldNodes are the matched nodes held because their condition carries no lastTransitionTime,
                  so the debounce cannot be evaluated; they stay stuck until a timestamp appears.
                items:
                  type: string
                type: array
              matchedCount:
                description: matchedCount is the number of nodes currently matching
                  the policy condition.
                format: int32
                type: integer
              matchedNodes:
                description: matchedNodes are the selected nodes whose condition currently
                  matches.
                items:
                  type: string
                type: array
              pendingCount:
                description: pendingCount is the number of matched nodes not yet remediated.
                format: int32
                type: integer
              pendingNodes:
                description: |-
                  pendingNodes are the matched nodes not yet remediated (awaiting the debounce window,
                  blocked by the guard, or being applied).
                items:
                  type: string
                type: array
              remediatedCount:
                description: remediatedCount is the number of nodes currently carrying
                  the remediation.
                format: int32
                type: integer
              remediatedNodes:
                description: remediatedNodes are the selected nodes that currently
                  carry the remediation taint.
                items:
                  type: string
                type: array
              selectedCount:
                description: selectedCount is the number of nodes in scope of the
                  policy.
                format: int32
                type: integer
              selectedNodes:
                description: selectedNodes are the nodes in scope, matching spec.nodeSelector
                  (empty selector = all nodes).
                items:
                  type: string
                type: array
              unknownCount:
                description: unknownCount is the number of selected nodes whose condition
                  is Unknown or unreported.
                format: int32
                type: integer
              unknownNodes:
                description: |-
                  unknownNodes are the selected nodes whose condition is Unknown or unreported (held:
                  neither remediated nor cleared).
                items:
                  type: string
                type: array
            type: object
        required:
        - spec
        type: object
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
    app.kubernetes.io/name: node-warden-operator
  name: node-warden-operator-controller-manager
  namespace: metalk8s-monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: node-warden-operator
  name: node-warden-operator-leader-election-role
  namespace: metalk8s-monitoring
rules:
- apiGroups:
  - ""
  resources:
  - configmaps
  verbs:
  - get
  - list
  - watch
  - create
  - update
  - patch
  - delete
- apiGroups:
  - coordination.k8s.io
  resources:
  - leases
  verbs:
  - get
  - list
  - watch
  - create
  - update
  - patch
  - delete
- apiGroups:
  - ""
  resources:
  - events
  verbs:
  - create
  - patch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-warden-operator-manager-role
rules:
- apiGroups:
  - ""
  resources:
  - nodes
  verbs:
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - events.k8s.io
  resources:
  - events
  verbs:
  - create
  - patch
- apiGroups:
  - warden.scality.com
  resources:
  - noderemediationpolicies
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - warden.scality.com
  resources:
  - noderemediationpolicies/finalizers
  verbs:
  - update
- apiGroups:
  - warden.scality.com
  resources:
  - noderemediationpolicies/status
  verbs:
  - get
  - patch
  - update
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-warden-operator-metrics-auth-role
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
  name: node-warden-operator-metrics-reader
rules:
- nonResourceURLs:
  - /metrics
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: node-warden-operator
  name: node-warden-operator-noderemediationpolicy-admin-role
rules:
- apiGroups:
  - warden.scality.com
  resources:
  - noderemediationpolicies
  verbs:
  - '*'
- apiGroups:
  - warden.scality.com
  resources:
  - noderemediationpolicies/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: node-warden-operator
  name: node-warden-operator-noderemediationpolicy-editor-role
rules:
- apiGroups:
  - warden.scality.com
  resources:
  - noderemediationpolicies
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - warden.scality.com
  resources:
  - noderemediationpolicies/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: node-warden-operator
  name: node-warden-operator-noderemediationpolicy-viewer-role
rules:
- apiGroups:
  - warden.scality.com
  resources:
  - noderemediationpolicies
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - warden.scality.com
  resources:
  - noderemediationpolicies/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: node-warden-operator
  name: node-warden-operator-leader-election-rolebinding
  namespace: metalk8s-monitoring
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: node-warden-operator-leader-election-role
subjects:
- kind: ServiceAccount
  name: node-warden-operator-controller-manager
  namespace: metalk8s-monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: node-warden-operator
  name: node-warden-operator-manager-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: node-warden-operator-manager-role
subjects:
- kind: ServiceAccount
  name: node-warden-operator-controller-manager
  namespace: metalk8s-monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: node-warden-operator-metrics-auth-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: node-warden-operator-metrics-auth-role
subjects:
- kind: ServiceAccount
  name: node-warden-operator-controller-manager
  namespace: metalk8s-monitoring
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: node-warden-operator
    control-plane: controller-manager
  name: node-warden-operator-controller-manager-metrics-service
  namespace: metalk8s-monitoring
spec:
  ports:
  - name: https
    port: 8443
    protocol: TCP
    targetPort: 8443
  selector:
    app.kubernetes.io/name: node-warden-operator
    control-plane: controller-manager
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: node-warden-operator
  name: node-warden-operator-webhook-service
  namespace: metalk8s-monitoring
spec:
  ports:
  - port: 443
    protocol: TCP
    targetPort: 9443
  selector:
    app.kubernetes.io/name: node-warden-operator
    control-plane: controller-manager
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: node-warden-operator
    control-plane: controller-manager
  name: node-warden-operator-controller-manager
  namespace: metalk8s-monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: node-warden-operator
      control-plane: controller-manager
  template:
    metadata:
      annotations:
        kubectl.kubernetes.io/default-container: manager
      labels:
        app.kubernetes.io/name: node-warden-operator
        control-plane: controller-manager
    nodeSelector:
      node-role.kubernetes.io/master: ""
    spec:
      containers:
      - args:
        - --metrics-bind-address=:8443
        - --leader-elect
        - --health-probe-bind-address=:8081
        - --metrics-cert-path=/tmp/k8s-metrics-server/metrics-certs
        - --webhook-cert-path=/tmp/k8s-webhook-server/serving-certs
        command:
        - /manager
        image: '{% endraw -%}{{ build_image_name("node-warden-operator", False) }}{%-
          raw %}:v1.0.0'
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
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
        volumeMounts:
        - mountPath: /tmp/k8s-metrics-server/metrics-certs
          name: metrics-certs
          readOnly: true
        - mountPath: /tmp/k8s-webhook-server/serving-certs
          name: webhook-certs
          readOnly: true
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      serviceAccountName: node-warden-operator-controller-manager
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
      - name: metrics-certs
        secret:
          items:
          - key: ca.crt
            path: ca.crt
          - key: tls.crt
            path: tls.crt
          - key: tls.key
            path: tls.key
          optional: false
          secretName: metrics-server-cert
      - name: webhook-certs
        secret:
          secretName: webhook-server-cert
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: node-warden-operator
  name: node-warden-operator-metrics-certs
  namespace: metalk8s-monitoring
spec:
  dnsNames:
  - node-warden-operator-controller-manager-metrics-service.metalk8s-monitoring.svc
  - node-warden-operator-controller-manager-metrics-service.metalk8s-monitoring.svc.cluster.local
  issuerRef:
    kind: Issuer
    name: node-warden-operator-selfsigned-issuer
  secretName: metrics-server-cert
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: node-warden-operator
  name: node-warden-operator-serving-cert
  namespace: metalk8s-monitoring
spec:
  dnsNames:
  - node-warden-operator-webhook-service.metalk8s-monitoring.svc
  - node-warden-operator-webhook-service.metalk8s-monitoring.svc.cluster.local
  issuerRef:
    kind: Issuer
    name: node-warden-operator-selfsigned-issuer
  secretName: webhook-server-cert
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: node-warden-operator
  name: node-warden-operator-selfsigned-issuer
  namespace: metalk8s-monitoring
spec:
  selfSigned: {}
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: node-warden-operator
    control-plane: controller-manager
    metalk8s.scality.com/monitor: ""
  name: node-warden-operator-controller-manager-metrics-monitor
  namespace: metalk8s-monitoring
spec:
  endpoints:
  - bearerTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
    path: /metrics
    port: https
    scheme: https
    tlsConfig:
      ca:
        secret:
          key: ca.crt
          name: metrics-server-cert
      cert:
        secret:
          key: tls.crt
          name: metrics-server-cert
      insecureSkipVerify: false
      keySecret:
        key: tls.key
        name: metrics-server-cert
      serverName: node-warden-operator-controller-manager-metrics-service.metalk8s-monitoring.svc
  selector:
    matchLabels:
      app.kubernetes.io/name: node-warden-operator
      control-plane: controller-manager
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  annotations:
    cert-manager.io/inject-ca-from: metalk8s-monitoring/node-warden-operator-serving-cert
  name: node-warden-operator-validating-webhook-configuration
webhooks:
- admissionReviewVersions:
  - v1
  clientConfig:
    service:
      name: node-warden-operator-webhook-service
      namespace: metalk8s-monitoring
      path: /validate-warden-scality-com-v1alpha1-noderemediationpolicy
  failurePolicy: Fail
  name: vnoderemediationpolicy-v1alpha1.kb.io
  rules:
  - apiGroups:
    - warden.scality.com
    apiVersions:
    - v1alpha1
    operations:
    - CREATE
    - UPDATE
    resources:
    - noderemediationpolicies
  sideEffects: None
{%- endraw %}

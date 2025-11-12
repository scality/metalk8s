#!jinja | metalk8s_kubernetes
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- raw %}
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.18.0
  name: managedcrls.crl-operator.scality.com
spec:
  group: crl-operator.scality.com
  names:
    kind: ManagedCRL
    listKind: ManagedCRLList
    plural: managedcrls
    shortNames:
    - mcrl
    singular: managedcrl
  scope: Namespaced
  versions:
  - additionalPrinterColumns:
    - jsonPath: .spec.issuerRef.name
      name: Issuer
      type: string
    - jsonPath: .status.crlValidUntil
      name: Expires
      type: string
    - jsonPath: .status.crlNumber
      name: CRL Number
      type: integer
    name: v1alpha1
    schema:
      openAPIV3Schema:
        description: ManagedCRL is the Schema for the managedcrls API.
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
            description: ManagedCRLSpec defines the desired state of ManagedCRL.
            properties:
              duration:
                description: |-
                  Duration is the duration for which the CRL is valid.
                  (default: 168h = 7 days)
                type: string
              expose:
                description: Expose specifies how the CRL should be exposed.
                properties:
                  enabled:
                    description: Enabled indicates whether the CRL should be exposed.
                    type: boolean
                  image:
                    description: Image specifies the container image to use for exposing
                      the CRL.
                    properties:
                      name:
                        description: |-
                          Name is the container image name.
                          (default: "nginx")
                        minLength: 1
                        type: string
                      pullSecrets:
                        description: |-
                          PullSecretRef is a reference to a Secret containing the image pull
                          credentials.
                        items:
                          description: |-
                            LocalObjectReference contains enough information to let you locate the
                            referenced object inside the same namespace.
                          properties:
                            name:
                              default: ""
                              description: |-
                                Name of the referent.
                                This field is effectively required, but due to backwards compatibility is
                                allowed to be empty. Instances of this type with an empty value here are
                                almost certainly wrong.
                                More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names
                              type: string
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      repository:
                        description: Repository is the container image repository.
                        minLength: 1
                        type: string
                      tag:
                        description: |-
                          Tag is the container image tag.
                          (default: "1.29.3-alpine3.22")
                        minLength: 1
                        type: string
                    type: object
                  ingress:
                    description: |-
                      Ingress indicates whether the CRL should be exposed externally outside the cluster
                      using an Ingress resource.
                      (default: Disabled)
                    properties:
                      className:
                        description: ClassName is the ingress class name to use for
                          the ingress.
                        type: string
                      enabled:
                        description: |-
                          Enabled indicates whether to create an Ingress resource to expose the CRL.
                          (default: true)
                        type: boolean
                      hostname:
                        description: |-
                          Hostname is the hostname to use for the ingress.
                          (One of Hostname or IPAddresses must be specified)
                        minLength: 1
                        type: string
                      ipAddresses:
                        description: |-
                          IPAddresses is a list of IP addresses to use for the ingress.
                          (One of Hostname or IPAddresses must be specified)
                        items:
                          format: ipv4
                          type: string
                        type: array
                      managed:
                        description: |-
                          Managed indicates whether the operator should manage the Ingress resource.
                          If false, the Ingress resource will not be created or updated by the operator.
                          (default: true)
                        type: boolean
                    type: object
                  internal:
                    description: |-
                      Internal indicates whether the issuer should be configured to reach the
                      CRL internally within the cluster.
                      (default: true)
                    type: boolean
                  nodeSelector:
                    additionalProperties:
                      type: string
                    description: Node Selector to deploy the CRL server
                    type: object
                  tolerations:
                    description: Tolerations to deploy the CRL server
                    items:
                      description: |-
                        The pod this Toleration is attached to tolerates any taint that matches
                        the triple <key,value,effect> using the matching operator <operator>.
                      properties:
                        effect:
                          description: |-
                            Effect indicates the taint effect to match. Empty means match all taint effects.
                            When specified, allowed values are NoSchedule, PreferNoSchedule and NoExecute.
                          type: string
                        key:
                          description: |-
                            Key is the taint key that the toleration applies to. Empty means match all taint keys.
                            If the key is empty, operator must be Exists; this combination means to match all values and all keys.
                          type: string
                        operator:
                          description: |-
                            Operator represents a key's relationship to the value.
                            Valid operators are Exists and Equal. Defaults to Equal.
                            Exists is equivalent to wildcard for value, so that a pod can
                            tolerate all taints of a particular category.
                          type: string
                        tolerationSeconds:
                          description: |-
                            TolerationSeconds represents the period of time the toleration (which must be
                            of effect NoExecute, otherwise this field is ignored) tolerates the taint. By default,
                            it is not set, which means tolerate the taint forever (do not evict). Zero and
                            negative values will be treated as 0 (evict immediately) by the system.
                          format: int64
                          type: integer
                        value:
                          description: |-
                            Value is the taint value the toleration matches to.
                            If the operator is Exists, the value should be empty, otherwise just a regular string.
                          type: string
                      type: object
                    type: array
                required:
                - enabled
                type: object
              issuerRef:
                description: |-
                  IssuerRef is a reference to the cert-manager Issuer or ClusterIssuer
                  that will sign the CRL.
                properties:
                  group:
                    description: |-
                      Group of the issuer being referred to.
                      Defaults to 'cert-manager.io'.
                    type: string
                  kind:
                    description: |-
                      Kind of the issuer being referred to.
                      Defaults to 'Issuer'.
                    type: string
                  name:
                    description: Name of the issuer being referred to.
                    type: string
                required:
                - name
                type: object
              revocations:
                description: Revocations is a list of certificates to be revoked.
                items:
                  description: RevocationSpec defines a certificate to be revoked.
                  properties:
                    reasonCode:
                      description: Reason is the reason for revocation (refer to RFC
                        5280 Section 5.3.1.).
                      type: integer
                    revocationTime:
                      description: |-
                        RevocationTime is the time at which the certificate was revoked.
                        If not specified, the current time will be used.
                      format: date-time
                      type: string
                    serialNumber:
                      description: SerialNumber is the serial number of the certificate
                        to be revoked.
                      minLength: 1
                      type: string
                  required:
                  - serialNumber
                  type: object
                type: array
            required:
            - issuerRef
            type: object
          status:
            description: ManagedCRLStatus defines the observed state of ManagedCRL.
            properties:
              conditions:
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
              crlNumber:
                description: CRLNumber is the number of the CRL.
                format: int64
                type: integer
              crlValidUntil:
                description: CRLValidUntil is the time until which the CRL is valid.
                format: date-time
                type: string
              ingressExposed:
                description: IngressExposed indicates whether the CRL Ingress is available.
                type: boolean
              issuerConfigured:
                description: IssuerConfigured indicates whether the Issuer is properly
                  configured.
                type: boolean
              observedCASecretRef:
                description: |-
                  ObservedCASecretRef is a reference to the Secret containing the last
                  CA certificate and private key used to sign the CRL.
                properties:
                  name:
                    description: name is unique within a namespace to reference a
                      secret resource.
                    type: string
                  namespace:
                    description: namespace defines the space within which the secret
                      name must be unique.
                    type: string
                type: object
                x-kubernetes-map-type: atomic
              observedCASecretVersion:
                description: |-
                  ObservedCASecretVersion is the resource version of the Secret
                  containing the last CA certificate and private key used to sign the CRL.
                type: string
              podExposed:
                description: PodExposed indicates whether the CRL expose Pod is running.
                type: boolean
              secretReady:
                description: SecretReady indicates whether the CRL is built and available
                  in the Secret.
                type: boolean
            type: object
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
    app.kubernetes.io/name: crl-operator
  name: crl-operator-controller-manager
  namespace: metalk8s-certs
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: crl-operator
  name: crl-operator-leader-election-role
  namespace: metalk8s-certs
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
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: crl-operator
  name: crl-operator-managedcrl-admin-role
rules:
- apiGroups:
  - crl-operator.scality.com
  resources:
  - managedcrls
  verbs:
  - '*'
- apiGroups:
  - crl-operator.scality.com
  resources:
  - managedcrls/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: crl-operator
  name: crl-operator-managedcrl-editor-role
rules:
- apiGroups:
  - crl-operator.scality.com
  resources:
  - managedcrls
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - crl-operator.scality.com
  resources:
  - managedcrls/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: crl-operator
  name: crl-operator-managedcrl-viewer-role
rules:
- apiGroups:
  - crl-operator.scality.com
  resources:
  - managedcrls
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - crl-operator.scality.com
  resources:
  - managedcrls/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: crl-operator-manager-role
rules:
- apiGroups:
  - ""
  resources:
  - configmaps
  - secrets
  - services
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - ""
  resources:
  - events
  verbs:
  - create
  - patch
- apiGroups:
  - apps
  resources:
  - deployments
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - cert-manager.io
  resources:
  - clusterissuers
  - issuers
  verbs:
  - get
  - list
  - patch
  - watch
- apiGroups:
  - crl-operator.scality.com
  resources:
  - managedcrls
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - crl-operator.scality.com
  resources:
  - managedcrls/finalizers
  verbs:
  - update
- apiGroups:
  - crl-operator.scality.com
  resources:
  - managedcrls/status
  verbs:
  - get
  - patch
  - update
- apiGroups:
  - networking.k8s.io
  resources:
  - ingresses
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
  name: crl-operator-metrics-auth-role
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
  name: crl-operator-metrics-reader
rules:
- nonResourceURLs:
  - /metrics
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: crl-operator
  name: crl-operator-leader-election-rolebinding
  namespace: metalk8s-certs
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: crl-operator-leader-election-role
subjects:
- kind: ServiceAccount
  name: crl-operator-controller-manager
  namespace: metalk8s-certs
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: crl-operator
  name: crl-operator-manager-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: crl-operator-manager-role
subjects:
- kind: ServiceAccount
  name: crl-operator-controller-manager
  namespace: metalk8s-certs
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: crl-operator-metrics-auth-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: crl-operator-metrics-auth-role
subjects:
- kind: ServiceAccount
  name: crl-operator-controller-manager
  namespace: metalk8s-certs
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: crl-operator
    control-plane: controller-manager
  name: crl-operator-controller-manager-metrics-service
  namespace: metalk8s-certs
spec:
  ports:
  - name: https
    port: 8443
    protocol: TCP
    targetPort: 8443
  selector:
    app.kubernetes.io/name: crl-operator
    control-plane: controller-manager
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: crl-operator
  name: crl-operator-webhook-service
  namespace: metalk8s-certs
spec:
  ports:
  - port: 443
    protocol: TCP
    targetPort: 9443
  selector:
    app.kubernetes.io/name: crl-operator
    control-plane: controller-manager
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: crl-operator
    control-plane: controller-manager
  name: crl-operator-controller-manager
  namespace: metalk8s-certs
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: crl-operator
      control-plane: controller-manager
  template:
    metadata:
      annotations:
        kubectl.kubernetes.io/default-container: manager
      labels:
        app.kubernetes.io/name: crl-operator
        control-plane: controller-manager
    nodeSelector:
      node-role.kubernetes.io/master: ""
    spec:
      containers:
      - args:
        - --metrics-bind-address=:8443
        - --leader-elect
        - --health-probe-bind-address=:8081
        - --webhook-cert-path=/tmp/k8s-webhook-server/serving-certs
        - --cert-manager-namespace=metalk8s-certs
        command:
        - /manager
        image: '{% endraw -%}{{ build_image_name("crl-operator", False) }}{%- raw
          %}:v1.0.0'
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
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - mountPath: /tmp/k8s-webhook-server/serving-certs
          name: webhook-certs
          readOnly: true
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      serviceAccountName: crl-operator-controller-manager
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
      - name: webhook-certs
        secret:
          secretName: webhook-server-cert
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: crl-operator
  name: crl-operator-metrics-certs
  namespace: metalk8s-certs
spec:
  dnsNames:
  - crl-operator-controller-manager-metrics-service.metalk8s-certs.svc
  - crl-operator-controller-manager-metrics-service.metalk8s-certs.svc.cluster.local
  issuerRef:
    kind: Issuer
    name: crl-operator-selfsigned-issuer
  secretName: metrics-server-cert
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: crl-operator
  name: crl-operator-serving-cert
  namespace: metalk8s-certs
spec:
  dnsNames:
  - crl-operator-webhook-service.metalk8s-certs.svc
  - crl-operator-webhook-service.metalk8s-certs.svc.cluster.local
  issuerRef:
    kind: Issuer
    name: crl-operator-selfsigned-issuer
  secretName: webhook-server-cert
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: crl-operator
  name: crl-operator-selfsigned-issuer
  namespace: metalk8s-certs
spec:
  selfSigned: {}
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  annotations:
    cert-manager.io/inject-ca-from: metalk8s-certs/crl-operator-serving-cert
  name: crl-operator-validating-webhook-configuration
webhooks:
- admissionReviewVersions:
  - v1
  clientConfig:
    service:
      name: crl-operator-webhook-service
      namespace: metalk8s-certs
      path: /validate-crl-operator-scality-com-v1alpha1-managedcrl
  failurePolicy: Fail
  name: vmanagedcrl-v1alpha1.kb.io
  rules:
  - apiGroups:
    - crl-operator.scality.com
    apiVersions:
    - v1alpha1
    operations:
    - CREATE
    - UPDATE
    resources:
    - managedcrls
  sideEffects: None
{%- endraw %}

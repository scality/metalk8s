#!jinja | metalk8s_kubernetes
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{%- raw %}
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.18.0
  name: mirrorconfigs.metalk8s.scality.com
spec:
  group: metalk8s.scality.com
  names:
    kind: MirrorConfig
    listKind: MirrorConfigList
    plural: mirrorconfigs
    singular: mirrorconfig
  scope: Namespaced
  versions:
  - name: v1alpha1
    schema:
      openAPIV3Schema:
        description: MirrorConfig is the Schema for the mirrorconfigs API.
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
            description: MirrorConfigSpec defines the desired state of MirrorConfig.
            properties:
              registries:
                description: Registries lists the upstream registries the workload
                  pulls through the mirror.
                items:
                  properties:
                    prefix:
                      description: Prefix of the upstream registry to mirror (e.g.
                        "docker.io").
                      minLength: 1
                      type: string
                  required:
                  - prefix
                  type: object
                type: array
            type: object
          status:
            description: MirrorConfigStatus defines the observed state of MirrorConfig.
            properties:
              caSecretRef:
                description: CASecretRef references the Secret the registry CA was
                  read from.
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
              conditions:
                description: Conditions of the MirrorConfig.
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
              observedRegistries:
                description: ObservedRegistries lists the prefixes rendered into the
                  ConfigMap.
                items:
                  type: string
                type: array
            type: object
        type: object
    served: true
    storage: true
    subresources:
      status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.18.0
  name: registries.metalk8s.scality.com
spec:
  group: metalk8s.scality.com
  names:
    kind: Registry
    listKind: RegistryList
    plural: registries
    singular: registry
  scope: Cluster
  versions:
  - additionalPrinterColumns:
    - jsonPath: .status.available
      name: Available
      priority: 1
      type: boolean
    - jsonPath: .status.ready
      name: Ready
      type: boolean
    - jsonPath: .status.replicas
      name: Replicas
      type: integer
    - jsonPath: .status.clusterIP
      name: ClusterIP
      type: string
    - jsonPath: .status.readyServerReplicas
      name: Server Replicas
      priority: 1
      type: integer
    - jsonPath: .status.readyAgentReplicas
      name: Agent Replicas
      priority: 1
      type: integer
    - jsonPath: .status.selectedNodes
      name: Selected Nodes
      priority: 1
      type: string
    name: v1alpha1
    schema:
      openAPIV3Schema:
        description: Registry is the Schema for the registries API.
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
            description: RegistrySpec defines the desired state of Registry.
            properties:
              agent:
                description: Agent is the specification of the registry node agent.
                properties:
                  authentication:
                    description: |-
                      Authentication is the specification of the registry node agent authentication mechanism
                      used to allow SolutionArchive distribution between registry node agents.
                    properties:
                      mtls:
                        description: mTLS authentication mechanism.
                        properties:
                          caSecretRef:
                            description: |-
                              CASecretRef is a reference to the secret containing the CA certificate
                              used to generate the certificates used for mTLS authentication.
                            properties:
                              name:
                                description: name is unique within a namespace to
                                  reference a secret resource.
                                type: string
                              namespace:
                                description: namespace defines the space within which
                                  the secret name must be unique.
                                type: string
                            type: object
                            x-kubernetes-map-type: atomic
                        required:
                        - caSecretRef
                        type: object
                    required:
                    - mtls
                    type: object
                  certificateIssuerRef:
                    description: |-
                      CertificateIssuerRef is a reference to the cert-manager Issuer or ClusterIssuer
                      that will generate the Certificate used by the registry node agent on its upload API endpoint.
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
                  image:
                    description: Image is the specification of the registry node agent
                      image.
                    properties:
                      name:
                        description: Name of the image, defaults to the component's
                          default image name.
                        type: string
                      pullPolicy:
                        description: PullPolicy of the image.
                        type: string
                      pullSecrets:
                        description: |-
                          PullSecrets is an optional list of references to secrets
                          to use for pulling the image.
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
                      registry:
                        description: Registry URL, defaults to the component's default
                          registry.
                        type: string
                      tag:
                        description: Tag of the image, defaults to the component's
                          default tag.
                        type: string
                    type: object
                required:
                - authentication
                - certificateIssuerRef
                type: object
              archivesPath:
                description: HostPath where to store ISO files, defaults to "/srv/scality/metalk8s/archives"
                type: string
                x-kubernetes-validations:
                - message: Value is immutable
                  rule: self == oldSelf
              logLevel:
                default: info
                description: Log level for Registry Node Agent and Registry Server,
                  defaults to "info"
                type: string
              mirrorPropagation:
                description: MirrorPropagation controls generation of the containerd
                  registry mirror ConfigMap.
                properties:
                  containerdConfigPath:
                    default: /etc/containerd/certs.d
                    description: |-
                      ContainerdConfigPath is the containerd mirror config path on the host,
                      defaults to "/etc/containerd/certs.d".
                    type: string
                  enabled:
                    default: true
                    description: Enabled controls whether the mirror config propagation
                      is active.
                    type: boolean
                  ignorePaths:
                    description: |-
                      IgnorePaths is a list of paths in the target directory that should not be
                      managed by the file-reflector (e.g. legacy registry config managed externally).
                    items:
                      type: string
                    type: array
                  image:
                    description: Image is the specification of the file-reflector
                      image.
                    properties:
                      name:
                        description: Name of the image, defaults to the component's
                          default image name.
                        type: string
                      pullPolicy:
                        description: PullPolicy of the image.
                        type: string
                      pullSecrets:
                        description: |-
                          PullSecrets is an optional list of references to secrets
                          to use for pulling the image.
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
                      registry:
                        description: Registry URL, defaults to the component's default
                          registry.
                        type: string
                      tag:
                        description: Tag of the image, defaults to the component's
                          default tag.
                        type: string
                    type: object
                  nodeSelector:
                    additionalProperties:
                      type: string
                    description: |-
                      NodeSelector for the sync DaemonSet pods.
                      Defaults to {"kubernetes.io/os": "linux"}.
                    type: object
                  tolerations:
                    description: Tolerations for the sync DaemonSet pods.
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
                            Valid operators are Exists, Equal, Lt, and Gt. Defaults to Equal.
                            Exists is equivalent to wildcard for value, so that a pod can
                            tolerate all taints of a particular category.
                            Lt and Gt perform numeric comparisons (requires feature gate TaintTolerationComparisonOperators).
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
              namespace:
                description: Namespace where the registry resources are deployed,
                  defaults to "metalk8s-registry-system".
                type: string
                x-kubernetes-validations:
                - message: Value is immutable
                  rule: self == oldSelf
              nodeSelector:
                additionalProperties:
                  type: string
                description: |-
                  NodeSelector is a selector which must be true for the registry to fit on a node.
                  Selector which must match a node's labels for the registry to be scheduled on that node.
                type: object
                x-kubernetes-map-type: atomic
                x-kubernetes-validations:
                - message: Value is immutable
                  rule: self == oldSelf
              server:
                description: Server is the specification of the registry server.
                properties:
                  certificateIssuerRef:
                    description: |-
                      CertificateIssuerRef is a reference to the cert-manager Issuer or ClusterIssuer
                      that will generate the Certificate used by the registry server on its API endpoint.
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
                  image:
                    description: Image is the specification of the registry server
                      image.
                    properties:
                      name:
                        description: Name of the image, defaults to the component's
                          default image name.
                        type: string
                      pullPolicy:
                        description: PullPolicy of the image.
                        type: string
                      pullSecrets:
                        description: |-
                          PullSecrets is an optional list of references to secrets
                          to use for pulling the image.
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
                      registry:
                        description: Registry URL, defaults to the component's default
                          registry.
                        type: string
                      tag:
                        description: Tag of the image, defaults to the component's
                          default tag.
                        type: string
                    type: object
                required:
                - certificateIssuerRef
                type: object
              solutionsPath:
                description: HostPath where to mount ISO files, defaults to "/srv/scality/metalk8s/solutions"
                type: string
                x-kubernetes-validations:
                - message: Value is immutable
                  rule: self == oldSelf
            required:
            - agent
            - nodeSelector
            - server
            type: object
          status:
            description: RegistryStatus defines the observed state of Registry.
            properties:
              agentAvailable:
                description: Availability of the registry node agent.
                type: boolean
              agentReady:
                description: Readiness of the registry node agent.
                type: boolean
              available:
                description: Availability of the registry.
                type: boolean
              clusterIP:
                description: |-
                  ClusterIP at which the registry is reachable, load-balanced across the
                  registry server replicas by kube-proxy.
                type: string
              conditions:
                description: Conditions of the registry.
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
              mirrorSyncAvailable:
                description: Availability of the containerd mirror sync.
                type: boolean
              mirrorSyncReady:
                description: Readiness of the containerd mirror sync.
                type: boolean
              nodeIPs:
                description: NodeIPs at which the registry is reachable directly on
                  each selected node.
                items:
                  type: string
                type: array
              ready:
                description: Readiness of the registry.
                type: boolean
              readyAgentReplicas:
                description: Number of ready replicas for RegistryNodeAgent.
                type: integer
              readyServerReplicas:
                description: Number of ready replicas for RegistryServer.
                type: integer
              replicas:
                description: Number of replicas for NodeAgent and RegistryServer.
                type: integer
              selectedNodes:
                description: Selected nodes for the registry, based on NodeSelector.
                items:
                  type: string
                type: array
              serverAvailable:
                description: Availability of the registry server.
                type: boolean
              serverReady:
                description: Readiness of the registry server.
                type: boolean
              statusPerNode:
                additionalProperties:
                  properties:
                    agent:
                      description: Status of the registry node agent on the related
                        node.
                      properties:
                        available:
                          description: Availability of the process on the related
                            node.
                          type: boolean
                        ready:
                          description: Readiness of the process on the related node.
                          type: boolean
                      required:
                      - available
                      - ready
                      type: object
                    server:
                      description: Status of the registry server on the related node.
                      properties:
                        available:
                          description: Availability of the process on the related
                            node.
                          type: boolean
                        ready:
                          description: Readiness of the process on the related node.
                          type: boolean
                      required:
                      - available
                      - ready
                      type: object
                  required:
                  - agent
                  - server
                  type: object
                description: |-
                  Status per node for the registry,
                  including availability and readiness of the registry server and node agent.
                type: object
            type: object
        type: object
    served: true
    storage: true
    subresources:
      status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.18.0
  name: solutionarchives.metalk8s.scality.com
spec:
  group: metalk8s.scality.com
  names:
    kind: SolutionArchive
    listKind: SolutionArchiveList
    plural: solutionarchives
    singular: solutionarchive
  scope: Cluster
  versions:
  - additionalPrinterColumns:
    - jsonPath: .spec.name
      name: Solution
      type: string
    - jsonPath: .spec.version
      name: Version
      type: string
    - jsonPath: .status.served
      name: Served
      priority: 1
      type: boolean
    - jsonPath: .status.replicated
      name: Replicated
      type: boolean
    - jsonPath: .status.servedReplicas
      name: Replicas
      type: integer
    - jsonPath: .status.targetReplicas
      name: Target
      type: integer
    - jsonPath: .status.nodeSolutionArchives
      name: Node Solution Archives
      priority: 1
      type: string
    name: v1alpha1
    schema:
      openAPIV3Schema:
        description: SolutionArchive is the Schema for the solutionarchives API.
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
            properties:
              name:
                description: Name of the SolutionArchive
                pattern: ^[a-zA-Z0-9][a-zA-Z0-9_\-\.]{1,98}[a-zA-Z0-9]$
                type: string
                x-kubernetes-validations:
                - message: Value is immutable
                  rule: self == oldSelf
              validation:
                description: Validation details for the SolutionArchive (optional,
                  but immutable)
                properties:
                  checksum:
                    description: Checksum of the SolutionArchive
                    properties:
                      type:
                        description: Type of digest
                        enum:
                        - sha256
                        type: string
                        x-kubernetes-validations:
                        - message: Value is immutable
                          rule: self == oldSelf
                      value:
                        description: Value of the digest
                        type: string
                        x-kubernetes-validations:
                        - message: Value is immutable
                          rule: self == oldSelf
                    required:
                    - type
                    - value
                    type: object
                    x-kubernetes-validations:
                    - message: Value is immutable
                      rule: self == oldSelf
                required:
                - checksum
                type: object
              version:
                description: Version of the SolutionArchive
                type: string
                x-kubernetes-validations:
                - message: Value is immutable
                  rule: self == oldSelf
            required:
            - name
            - version
            type: object
          status:
            description: SolutionArchiveStatus defines the observed state of SolutionArchive.
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
              nodeSolutionArchives:
                description: List of NodeSolutionArchive names
                items:
                  type: string
                type: array
              replicated:
                description: True, when all NodeSolutionArchive in Served status
                type: boolean
              served:
                description: True, when, at least, one NodeSolutionArchive in Served
                  status
                type: boolean
              servedReplicas:
                description: Number of NodeSolutionArchive in Served status
                type: integer
              statusPerNodeSolutionArchive:
                additionalProperties:
                  properties:
                    served:
                      description: True, when the NodeSolutionArchive is in Served
                        status
                      type: boolean
                  required:
                  - served
                  type: object
                description: Status of each NodeSolutionArchive
                type: object
              targetReplicas:
                description: Expected number of NodeSolutionArchive in Served status
                type: integer
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
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-controller-manager
  namespace: metalk8s-registry-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-leader-election-role
  namespace: metalk8s-registry-system
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
  name: metalk8s-registry-operator-manager-role
rules:
- apiGroups:
  - ""
  resources:
  - configmaps
  - namespaces
  - secrets
  - serviceaccounts
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
  - ""
  resources:
  - nodes
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - admissionregistration.k8s.io
  resources:
  - validatingwebhookconfigurations
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - apiextensions.k8s.io
  resources:
  - customresourcedefinitions
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - apps
  resources:
  - daemonsets
  - statefulsets
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
  - certificates
  - clusterissuers
  - issuers
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - coordination.k8s.io
  resources:
  - leases
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
  - mirrorconfigs
  - registries
  - solutionarchives
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
  - mirrorconfigs/finalizers
  - registries/finalizers
  - solutionarchives/finalizers
  verbs:
  - update
- apiGroups:
  - metalk8s.scality.com
  resources:
  - mirrorconfigs/status
  - nodesolutionarchives/status
  - registries/status
  - solutionarchives/status
  verbs:
  - get
  - patch
  - update
- apiGroups:
  - metalk8s.scality.com
  resources:
  - nodesolutionarchives
  verbs:
  - '*'
- apiGroups:
  - metalk8s.scality.com
  resources:
  - nodesolutionarchives/finalizers
  verbs:
  - delete
  - update
- apiGroups:
  - rbac.authorization.k8s.io
  resources:
  - clusterrolebindings
  - clusterroles
  - rolebindings
  - roles
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
  name: metalk8s-registry-operator-metrics-auth-role
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
  name: metalk8s-registry-operator-metrics-reader-extension
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
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-mirrorconfig-admin-role
rules:
- apiGroups:
  - metalk8s.scality.com
  resources:
  - mirrorconfigs
  verbs:
  - '*'
- apiGroups:
  - metalk8s.scality.com
  resources:
  - mirrorconfigs/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-mirrorconfig-editor-role
rules:
- apiGroups:
  - metalk8s.scality.com
  resources:
  - mirrorconfigs
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
  - mirrorconfigs/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-mirrorconfig-viewer-role
rules:
- apiGroups:
  - metalk8s.scality.com
  resources:
  - mirrorconfigs
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - metalk8s.scality.com
  resources:
  - mirrorconfigs/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-registry-admin-role
rules:
- apiGroups:
  - metalk8s.scality.com
  resources:
  - registries
  verbs:
  - '*'
- apiGroups:
  - metalk8s.scality.com
  resources:
  - registries/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-registry-editor-role
rules:
- apiGroups:
  - metalk8s.scality.com
  resources:
  - registries
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
  - registries/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-registry-viewer-role
rules:
- apiGroups:
  - metalk8s.scality.com
  resources:
  - registries
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - metalk8s.scality.com
  resources:
  - registries/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-solutionarchive-admin-role
rules:
- apiGroups:
  - metalk8s.scality.com
  resources:
  - solutionarchives
  verbs:
  - '*'
- apiGroups:
  - metalk8s.scality.com
  resources:
  - solutionarchives/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-solutionarchive-editor-role
rules:
- apiGroups:
  - metalk8s.scality.com
  resources:
  - solutionarchives
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
  - solutionarchives/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-solutionarchive-viewer-role
rules:
- apiGroups:
  - metalk8s.scality.com
  resources:
  - solutionarchives
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - metalk8s.scality.com
  resources:
  - solutionarchives/status
  verbs:
  - get
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-leader-election-rolebinding
  namespace: metalk8s-registry-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: metalk8s-registry-operator-leader-election-role
subjects:
- kind: ServiceAccount
  name: metalk8s-registry-operator-controller-manager
  namespace: metalk8s-registry-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-additional-manager-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: metalk8s-registry-operator-metrics-reader-extension
subjects:
- kind: ServiceAccount
  name: metalk8s-registry-operator-controller-manager
  namespace: metalk8s-registry-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-manager-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: metalk8s-registry-operator-manager-role
subjects:
- kind: ServiceAccount
  name: metalk8s-registry-operator-controller-manager
  namespace: metalk8s-registry-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: metalk8s-registry-operator-metrics-auth-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: metalk8s-registry-operator-metrics-auth-role
subjects:
- kind: ServiceAccount
  name: metalk8s-registry-operator-controller-manager
  namespace: metalk8s-registry-system
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-webhook-service
  namespace: metalk8s-registry-system
spec:
  ports:
  - port: 443
    protocol: TCP
    targetPort: 9443
  selector:
    app.kubernetes.io/name: metalk8s-registry-operator
    control-plane: controller-manager
---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
    control-plane: controller-manager
  name: metalk8s-registry-operator-controller-manager
  namespace: metalk8s-registry-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: metalk8s-registry-operator
      control-plane: controller-manager
  template:
    metadata:
      annotations:
        kubectl.kubernetes.io/default-container: manager
      labels:
        app.kubernetes.io/name: metalk8s-registry-operator
        control-plane: controller-manager
    nodeSelector:
      node-role.kubernetes.io/master: ""
    spec:
      containers:
      - args:
        - --leader-elect
        - --health-probe-bind-address=:8081
        - --webhook-cert-path=/tmp/k8s-webhook-server/serving-certs
        command:
        - /manager
        image: '{% endraw -%}{{ build_image_name("metalk8s-registry-operator", False)
          }}{%- raw %}:v0.0.1-alpha.4'
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
      serviceAccountName: metalk8s-registry-operator-controller-manager
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
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-serving-cert
  namespace: metalk8s-registry-system
spec:
  dnsNames:
  - metalk8s-registry-operator-webhook-service.metalk8s-registry-system.svc
  - metalk8s-registry-operator-webhook-service.metalk8s-registry-system.svc.cluster.local
  issuerRef:
    kind: Issuer
    name: metalk8s-registry-operator-selfsigned-issuer
  secretName: webhook-server-cert
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  labels:
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: metalk8s-registry-operator
  name: metalk8s-registry-operator-selfsigned-issuer
  namespace: metalk8s-registry-system
spec:
  selfSigned: {}
---
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  annotations:
    cert-manager.io/inject-ca-from: metalk8s-registry-system/metalk8s-registry-operator-serving-cert
  name: metalk8s-registry-operator-mutating-webhook-configuration
webhooks:
- admissionReviewVersions:
  - v1
  clientConfig:
    service:
      name: metalk8s-registry-operator-webhook-service
      namespace: metalk8s-registry-system
      path: /mutate-metalk8s-scality-com-v1alpha1-registry
  failurePolicy: Fail
  name: mregistry-v1alpha1.kb.io
  rules:
  - apiGroups:
    - metalk8s.scality.com
    apiVersions:
    - v1alpha1
    operations:
    - CREATE
    - UPDATE
    resources:
    - registries
  sideEffects: None
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  annotations:
    cert-manager.io/inject-ca-from: metalk8s-registry-system/metalk8s-registry-operator-serving-cert
  name: metalk8s-registry-operator-validating-webhook-configuration
webhooks:
- admissionReviewVersions:
  - v1
  clientConfig:
    service:
      name: metalk8s-registry-operator-webhook-service
      namespace: metalk8s-registry-system
      path: /validate-metalk8s-scality-com-v1alpha1-mirrorconfig
  failurePolicy: Fail
  name: vmirrorconfig-v1alpha1.kb.io
  rules:
  - apiGroups:
    - metalk8s.scality.com
    apiVersions:
    - v1alpha1
    operations:
    - CREATE
    - UPDATE
    resources:
    - mirrorconfigs
  sideEffects: None
- admissionReviewVersions:
  - v1
  clientConfig:
    service:
      name: metalk8s-registry-operator-webhook-service
      namespace: metalk8s-registry-system
      path: /validate-metalk8s-scality-com-v1alpha1-registry
  failurePolicy: Fail
  name: vregistry-v1alpha1.kb.io
  rules:
  - apiGroups:
    - metalk8s.scality.com
    apiVersions:
    - v1alpha1
    operations:
    - CREATE
    - UPDATE
    resources:
    - registries
  sideEffects: None
- admissionReviewVersions:
  - v1
  clientConfig:
    service:
      name: metalk8s-registry-operator-webhook-service
      namespace: metalk8s-registry-system
      path: /validate-metalk8s-scality-com-v1alpha1-solutionarchive
  failurePolicy: Fail
  name: vsolutionarchive-v1alpha1.kb.io
  rules:
  - apiGroups:
    - metalk8s.scality.com
    apiVersions:
    - v1alpha1
    operations:
    - CREATE
    resources:
    - solutionarchives
  sideEffects: None

{%- endraw %}

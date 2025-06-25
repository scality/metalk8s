#!jinja | metalk8s_kubernetes

{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- from "metalk8s/map.jinja" import networks with context %}

# Cilium CRDs are required to work and normally deployed by Cilium Operator
# but we face race condition between Cilium Pods starts and Gateway API configuration
# So we manually apply Cilium CRDs
# note: apply --set operator.skipCRDCreation=true

---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  labels:
    io.cilium.k8s.crd.schema.version: 1.30.8
  name: ciliumcidrgroups.cilium.io
spec:
  conversion:
    strategy: None
  group: cilium.io
  names:
    categories:
    - cilium
    kind: CiliumCIDRGroup
    listKind: CiliumCIDRGroupList
    plural: ciliumcidrgroups
    shortNames:
    - ccg
    singular: ciliumcidrgroup
  scope: Cluster
  versions:
  - name: v2alpha1
    schema:
      openAPIV3Schema:
        description: |-
          CiliumCIDRGroup is a list of external CIDRs (i.e: CIDRs selecting peers
          outside the clusters) that can be referenced as a single entity from
          CiliumNetworkPolicies.
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
              externalCIDRs:
                description: ExternalCIDRs is a list of CIDRs selecting peers outside
                  the clusters.
                items:
                  description: |-
                    CIDR specifies a block of IP addresses.
                    Example: 192.0.2.1/32
                  format: cidr
                  type: string
                minItems: 0
                type: array
            required:
            - externalCIDRs
            type: object
        required:
        - spec
        type: object
    served: true
    storage: true
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  labels:
    io.cilium.k8s.crd.schema.version: 1.30.8
  name: ciliumclusterwideenvoyconfigs.cilium.io
spec:
  conversion:
    strategy: None
  group: cilium.io
  names:
    categories:
    - cilium
    kind: CiliumClusterwideEnvoyConfig
    listKind: CiliumClusterwideEnvoyConfigList
    plural: ciliumclusterwideenvoyconfigs
    shortNames:
    - ccec
    singular: ciliumclusterwideenvoyconfig
  scope: Cluster
  versions:
  - additionalPrinterColumns:
    - description: The age of the identity
      jsonPath: .metadata.creationTimestamp
      name: Age
      type: date
    name: v2
    schema:
      openAPIV3Schema:
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
              backendServices:
                description: |-
                  BackendServices specifies Kubernetes services whose backends
                  are automatically synced to Envoy using EDS.  Traffic for these
                  services is not forwarded to an Envoy listener. This allows an
                  Envoy listener load balance traffic to these backends while
                  normal Cilium service load balancing takes care of balancing
                  traffic for these services at the same time.
                items:
                  properties:
                    name:
                      description: |-
                        Name is the name of a destination Kubernetes service that identifies traffic
                        to be redirected.
                      type: string
                    namespace:
                      description: |-
                        Namespace is the Kubernetes service namespace.
                        In CiliumEnvoyConfig namespace defaults to the namespace of the CEC,
                        In CiliumClusterwideEnvoyConfig namespace defaults to "default".
                      type: string
                    number:
                      description: |-
                        Ports is a set of port numbers, which can be used for filtering in case of underlying
                        is exposing multiple port numbers.
                      items:
                        type: string
                      type: array
                  required:
                  - name
                  type: object
                type: array
              nodeSelector:
                description: |-
                  NodeSelector is a label selector that determines to which nodes
                  this configuration applies.
                  If nil, then this config applies to all nodes.
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
                          enum:
                          - In
                          - NotIn
                          - Exists
                          - DoesNotExist
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
                      description: MatchLabelsValue represents the value from the
                        MatchLabels {key,value} pair.
                      maxLength: 63
                      pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                      type: string
                    description: |-
                      matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                      map is equivalent to an element of matchExpressions, whose key field is "key", the
                      operator is "In", and the values array contains only "value". The requirements are ANDed.
                    type: object
                type: object
                x-kubernetes-map-type: atomic
              resources:
                description: |-
                  Envoy xDS resources, a list of the following Envoy resource types:
                  type.googleapis.com/envoy.config.listener.v3.Listener,
                  type.googleapis.com/envoy.config.route.v3.RouteConfiguration,
                  type.googleapis.com/envoy.config.cluster.v3.Cluster,
                  type.googleapis.com/envoy.config.endpoint.v3.ClusterLoadAssignment, and
                  type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.Secret.
                items:
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                type: array
              services:
                description: |-
                  Services specifies Kubernetes services for which traffic is
                  forwarded to an Envoy listener for L7 load balancing. Backends
                  of these services are automatically synced to Envoy usign EDS.
                items:
                  properties:
                    listener:
                      description: |-
                        Listener specifies the name of the Envoy listener the
                        service traffic is redirected to. The listener must be
                        specified in the Envoy 'resources' of the same
                        CiliumEnvoyConfig.

                        If omitted, the first listener specified in 'resources' is
                        used.
                      type: string
                    name:
                      description: |-
                        Name is the name of a destination Kubernetes service that identifies traffic
                        to be redirected.
                      type: string
                    namespace:
                      description: |-
                        Namespace is the Kubernetes service namespace.
                        In CiliumEnvoyConfig namespace this is overridden to the namespace of the CEC,
                        In CiliumClusterwideEnvoyConfig namespace defaults to "default".
                      type: string
                    ports:
                      description: |-
                        Ports is a set of service's frontend ports that should be redirected to the Envoy
                        listener. By default all frontend ports of the service are redirected.
                      items:
                        type: integer
                      type: array
                  required:
                  - name
                  type: object
                type: array
            required:
            - resources
            type: object
        required:
        - metadata
        type: object
    served: true
    storage: true
    subresources: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  labels:
    io.cilium.k8s.crd.schema.version: 1.30.8
  name: ciliumclusterwidenetworkpolicies.cilium.io
spec:
  conversion:
    strategy: None
  group: cilium.io
  names:
    categories:
    - cilium
    - ciliumpolicy
    kind: CiliumClusterwideNetworkPolicy
    listKind: CiliumClusterwideNetworkPolicyList
    plural: ciliumclusterwidenetworkpolicies
    shortNames:
    - ccnp
    singular: ciliumclusterwidenetworkpolicy
  scope: Cluster
  versions:
  - additionalPrinterColumns:
    - jsonPath: .status.conditions[?(@.type=='Valid')].status
      name: Valid
      type: string
    name: v2
    schema:
      openAPIV3Schema:
        description: |-
          CiliumClusterwideNetworkPolicy is a Kubernetes third-party resource with an
          modified version of CiliumNetworkPolicy which is cluster scoped rather than
          namespace scoped.
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
            anyOf:
            - properties:
                ingress: {}
              required:
              - ingress
            - properties:
                ingressDeny: {}
              required:
              - ingressDeny
            - properties:
                egress: {}
              required:
              - egress
            - properties:
                egressDeny: {}
              required:
              - egressDeny
            description: Spec is the desired Cilium specific rule specification.
            oneOf:
            - properties:
                endpointSelector: {}
              required:
              - endpointSelector
            - properties:
                nodeSelector: {}
              required:
              - nodeSelector
            properties:
              description:
                description: |-
                  Description is a free form string, it can be used by the creator of
                  the rule to store human readable explanation of the purpose of this
                  rule. Rules cannot be identified by comment.
                type: string
              egress:
                description: |-
                  Egress is a list of EgressRule which are enforced at egress.
                  If omitted or empty, this rule does not apply at egress.
                items:
                  description: |-
                    EgressRule contains all rule types which can be applied at egress, i.e.
                    network traffic that originates inside the endpoint and exits the endpoint
                    selected by the endpointSelector.

                      - All members of this structure are optional. If omitted or empty, the
                        member will have no effect on the rule.

                      - If multiple members of the structure are specified, then all members
                        must match in order for the rule to take effect. The exception to this
                        rule is the ToRequires member; the effects of any Requires field in any
                        rule will apply to all other rules as well.

                      - ToEndpoints, ToCIDR, ToCIDRSet, ToEntities, ToServices and ToGroups are
                        mutually exclusive. Only one of these members may be present within an
                        individual rule.
                  properties:
                    authentication:
                      description: Authentication is the required authentication
                        type for the allowed traffic, if any.
                      properties:
                        mode:
                          description: Mode is the required authentication mode
                            for the allowed traffic, if any.
                          enum:
                          - disabled
                          - required
                          - test-always-fail
                          type: string
                      required:
                      - mode
                      type: object
                    icmps:
                      description: |-
                        ICMPs is a list of ICMP rule identified by type number
                        which the endpoint subject to the rule is allowed to connect to.

                        Example:
                        Any endpoint with the label "app=httpd" is allowed to initiate
                        type 8 ICMP connections.
                      items:
                        description: ICMPRule is a list of ICMP fields.
                        properties:
                          fields:
                            description: Fields is a list of ICMP fields.
                            items:
                              description: ICMPField is a ICMP field.
                              properties:
                                family:
                                  default: IPv4
                                  description: |-
                                    Family is a IP address version.
                                    Currently, we support `IPv4` and `IPv6`.
                                    `IPv4` is set as default.
                                  enum:
                                  - IPv4
                                  - IPv6
                                  type: string
                                type:
                                  anyOf:
                                  - type: integer
                                  - type: string
                                  description: "Type is a ICMP-type.\nIt should
                                    be an 8bit code (0-255), or it's CamelCase name
                                    (for example, \"EchoReply\").\nAllowed ICMP
                                    types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                    | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                    | RouterSelection | TimeExceeded | ParameterProblem
                                    |\n\t\t\t Timestamp | TimestampReply | Photuris
                                    | ExtendedEcho Request | ExtendedEcho Reply\n
                                    \   Ipv6: DestinationUnreachable | PacketTooBig
                                    | TimeExceeded | ParameterProblem |\n\t\t\t
                                    EchoRequest | EchoReply | MulticastListenerQuery|
                                    MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                    | RouterSolicitation | RouterAdvertisement |
                                    NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                    | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                    |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                    | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                    HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                    | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                    | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                    |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                  pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                    Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                  x-kubernetes-int-or-string: true
                              required:
                              - type
                              type: object
                            maxItems: 40
                            type: array
                        type: object
                      type: array
                    toCIDR:
                      description: |-
                        ToCIDR is a list of IP blocks which the endpoint subject to the rule
                        is allowed to initiate connections. Only connections destined for
                        outside of the cluster and not targeting the host will be subject
                        to CIDR rules.  This will match on the destination IP address of
                        outgoing connections. Adding a prefix into ToCIDR or into ToCIDRSet
                        with no ExcludeCIDRs is equivalent. Overlaps are allowed between
                        ToCIDR and ToCIDRSet.

                        Example:
                        Any endpoint with the label "app=database-proxy" is allowed to
                        initiate connections to 10.2.3.0/24
                      items:
                        description: |-
                          CIDR specifies a block of IP addresses.
                          Example: 192.0.2.1/32
                        format: cidr
                        type: string
                      type: array
                    toCIDRSet:
                      description: |-
                        ToCIDRSet is a list of IP blocks which the endpoint subject to the rule
                        is allowed to initiate connections to in addition to connections
                        which are allowed via ToEndpoints, along with a list of subnets contained
                        within their corresponding IP block to which traffic should not be
                        allowed. This will match on the destination IP address of outgoing
                        connections. Adding a prefix into ToCIDR or into ToCIDRSet with no
                        ExcludeCIDRs is equivalent. Overlaps are allowed between ToCIDR and
                        ToCIDRSet.

                        Example:
                        Any endpoint with the label "app=database-proxy" is allowed to
                        initiate connections to 10.2.3.0/24 except from IPs in subnet 10.2.3.0/28.
                      items:
                        description: |-
                          CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                          communication  is allowed, along with an optional list of subnets within that
                          CIDR prefix to/from which outside communication is not allowed.
                        oneOf:
                        - properties:
                            cidr: {}
                          required:
                          - cidr
                        - properties:
                            cidrGroupRef: {}
                          required:
                          - cidrGroupRef
                        - properties:
                            cidrGroupSelector: {}
                          required:
                          - cidrGroupSelector
                        properties:
                          cidr:
                            description: CIDR is a CIDR prefix / IP Block.
                            format: cidr
                            type: string
                          cidrGroupRef:
                            description: |-
                              CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                              A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                              the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                              connections from.
                            maxLength: 253
                            pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                            type: string
                          cidrGroupSelector:
                            description: |-
                              CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                              rather than by name.
                            properties:
                              matchExpressions:
                                description: matchExpressions is a list of label
                                  selector requirements. The requirements are ANDed.
                                items:
                                  description: |-
                                    A label selector requirement is a selector that contains values, a key, and an operator that
                                    relates the key and values.
                                  properties:
                                    key:
                                      description: key is the label key that the
                                        selector applies to.
                                      type: string
                                    operator:
                                      description: |-
                                        operator represents a key's relationship to a set of values.
                                        Valid operators are In, NotIn, Exists and DoesNotExist.
                                      enum:
                                      - In
                                      - NotIn
                                      - Exists
                                      - DoesNotExist
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
                                  description: MatchLabelsValue represents the value
                                    from the MatchLabels {key,value} pair.
                                  maxLength: 63
                                  pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                  type: string
                                description: |-
                                  matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                  map is equivalent to an element of matchExpressions, whose key field is "key", the
                                  operator is "In", and the values array contains only "value". The requirements are ANDed.
                                type: object
                            type: object
                            x-kubernetes-map-type: atomic
                          except:
                            description: |-
                              ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                              is not allowed to initiate connections to. These CIDR prefixes should be
                              contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                              supported yet.
                              These exceptions are only applied to the Cidr in this CIDRRule, and do not
                              apply to any other CIDR prefixes in any other CIDRRules.
                            items:
                              description: |-
                                CIDR specifies a block of IP addresses.
                                Example: 192.0.2.1/32
                              format: cidr
                              type: string
                            type: array
                        type: object
                      type: array
                    toEndpoints:
                      description: |-
                        ToEndpoints is a list of endpoints identified by an EndpointSelector to
                        which the endpoints subject to the rule are allowed to communicate.

                        Example:
                        Any endpoint with the label "role=frontend" can communicate with any
                        endpoint carrying the label "role=backend".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    toEntities:
                      description: |-
                        ToEntities is a list of special entities to which the endpoint subject
                        to the rule is allowed to initiate connections. Supported entities are
                        `world`, `cluster`,`host`,`remote-node`,`kube-apiserver`, `init`,
                        `health`,`unmanaged` and `all`.
                      items:
                        description: |-
                          Entity specifies the class of receiver/sender endpoints that do not have
                          individual identities.  Entities are used to describe "outside of cluster",
                          "host", etc.
                        enum:
                        - all
                        - world
                        - cluster
                        - host
                        - init
                        - ingress
                        - unmanaged
                        - remote-node
                        - health
                        - none
                        - kube-apiserver
                        type: string
                      type: array
                    toFQDNs:
                      description: |-
                        ToFQDN allows whitelisting DNS names in place of IPs. The IPs that result
                        from DNS resolution of `ToFQDN.MatchName`s are added to the same
                        EgressRule object as ToCIDRSet entries, and behave accordingly. Any L4 and
                        L7 rules within this EgressRule will also apply to these IPs.
                        The DNS -> IP mapping is re-resolved periodically from within the
                        cilium-agent, and the IPs in the DNS response are effected in the policy
                        for selected pods as-is (i.e. the list of IPs is not modified in any way).
                        Note: An explicit rule to allow for DNS traffic is needed for the pods, as
                        ToFQDN counts as an egress rule and will enforce egress policy when
                        PolicyEnforcment=default.
                        Note: If the resolved IPs are IPs within the kubernetes cluster, the
                        ToFQDN rule will not apply to that IP.
                        Note: ToFQDN cannot occur in the same policy as other To* rules.
                      items:
                        oneOf:
                        - properties:
                            matchName: {}
                          required:
                          - matchName
                        - properties:
                            matchPattern: {}
                          required:
                          - matchPattern
                        properties:
                          matchName:
                            description: |-
                              MatchName matches literal DNS names. A trailing "." is automatically added
                              when missing.
                            maxLength: 255
                            pattern: ^([-a-zA-Z0-9_]+[.]?)+$
                            type: string
                          matchPattern:
                            description: |-
                              MatchPattern allows using wildcards to match DNS names. All wildcards are
                              case insensitive. The wildcards are:
                              - "*" matches 0 or more DNS valid characters, and may occur anywhere in
                              the pattern. As a special case a "*" as the leftmost character, without a
                              following "." matches all subdomains as well as the name to the right.
                              A trailing "." is automatically added when missing.

                              Examples:
                              `*.cilium.io` matches subomains of cilium at that level
                                www.cilium.io and blog.cilium.io match, cilium.io and google.com do not
                              `*cilium.io` matches cilium.io and all subdomains ends with "cilium.io"
                                except those containing "." separator, subcilium.io and sub-cilium.io match,
                                www.cilium.io and blog.cilium.io does not
                              sub*.cilium.io matches subdomains of cilium where the subdomain component
                              begins with "sub"
                                sub.cilium.io and subdomain.cilium.io match, www.cilium.io,
                                blog.cilium.io, cilium.io and google.com do not
                            maxLength: 255
                            pattern: ^([-a-zA-Z0-9_*]+[.]?)+$
                            type: string
                        type: object
                      type: array
                    toGroups:
                      description: |-
                        ToGroups is a directive that allows the integration with multiple outside
                        providers. Currently, only AWS is supported, and the rule can select by
                        multiple sub directives:

                        Example:
                        toGroups:
                        - aws:
                            securityGroupsIds:
                            - 'sg-XXXXXXXXXXXXX'
                      items:
                        description: |-
                          Groups structure to store all kinds of new integrations that needs a new
                          derivative policy.
                        properties:
                          aws:
                            description: AWSGroup is an structure that can be used
                              to whitelisting information from AWS integration
                            properties:
                              labels:
                                additionalProperties:
                                  type: string
                                type: object
                              region:
                                type: string
                              securityGroupsIds:
                                items:
                                  type: string
                                type: array
                              securityGroupsNames:
                                items:
                                  type: string
                                type: array
                            type: object
                        type: object
                      type: array
                    toNodes:
                      description: |-
                        ToNodes is a list of nodes identified by an
                        EndpointSelector to which endpoints subject to the rule is allowed to communicate.
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    toPorts:
                      description: |-
                        ToPorts is a list of destination ports identified by port number and
                        protocol which the endpoint subject to the rule is allowed to
                        connect to.

                        Example:
                        Any endpoint with the label "role=frontend" is allowed to initiate
                        connections to destination port 8080/tcp
                      items:
                        description: |-
                          PortRule is a list of ports/protocol combinations with optional Layer 7
                          rules which must be met.
                        properties:
                          listener:
                            description: |-
                              listener specifies the name of a custom Envoy listener to which this traffic should be
                              redirected to.
                            properties:
                              envoyConfig:
                                description: |-
                                  EnvoyConfig is a reference to the CEC or CCEC resource in which
                                  the listener is defined.
                                properties:
                                  kind:
                                    description: |-
                                      Kind is the resource type being referred to. Defaults to CiliumEnvoyConfig or
                                      CiliumClusterwideEnvoyConfig for CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy,
                                      respectively. The only case this is currently explicitly needed is when referring to a
                                      CiliumClusterwideEnvoyConfig from CiliumNetworkPolicy, as using a namespaced listener
                                      from a cluster scoped policy is not allowed.
                                    enum:
                                    - CiliumEnvoyConfig
                                    - CiliumClusterwideEnvoyConfig
                                    type: string
                                  name:
                                    description: |-
                                      Name is the resource name of the CiliumEnvoyConfig or CiliumClusterwideEnvoyConfig where
                                      the listener is defined in.
                                    minLength: 1
                                    type: string
                                required:
                                - name
                                type: object
                              name:
                                description: Name is the name of the listener.
                                minLength: 1
                                type: string
                              priority:
                                description: |-
                                  Priority for this Listener that is used when multiple rules would apply different
                                  listeners to a policy map entry. Behavior of this is implementation dependent.
                                maximum: 100
                                minimum: 1
                                type: integer
                            required:
                            - envoyConfig
                            - name
                            type: object
                          originatingTLS:
                            description: |-
                              OriginatingTLS is the TLS context for the connections originated by
                              the L7 proxy.  For egress policy this specifies the client-side TLS
                              parameters for the upstream connection originating from the L7 proxy
                              to the remote destination. For ingress policy this specifies the
                              client-side TLS parameters for the connection from the L7 proxy to
                              the local endpoint.
                            properties:
                              certificate:
                                description: |-
                                  Certificate is the file name or k8s secret item name for the certificate
                                  chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                  item must exist.
                                type: string
                              privateKey:
                                description: |-
                                  PrivateKey is the file name or k8s secret item name for the private key
                                  matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                  exists. If given, the item must exist.
                                type: string
                              secret:
                                description: |-
                                  Secret is the secret that contains the certificates and private key for
                                  the TLS context.
                                  By default, Cilium will search in this secret for the following items:
                                    - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                    - 'tls.crt' - Which represents the public key certificate.
                                    - 'tls.key' - Which represents the private key matching the public key
                                                  certificate.
                                properties:
                                  name:
                                    description: Name is the name of the secret.
                                    type: string
                                  namespace:
                                    description: |-
                                      Namespace is the namespace in which the secret exists. Context of use
                                      determines the default value if left out (e.g., "default").
                                    type: string
                                required:
                                - name
                                type: object
                              trustedCA:
                                description: |-
                                  TrustedCA is the file name or k8s secret item name for the trusted CA.
                                  If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                  exist.
                                type: string
                            required:
                            - secret
                            type: object
                          ports:
                            description: Ports is a list of L4 port/protocol
                            items:
                              description: PortProtocol specifies an L4 port with
                                an optional transport protocol
                              properties:
                                endPort:
                                  description: EndPort can only be an L4 port number.
                                  format: int32
                                  maximum: 65535
                                  minimum: 0
                                  type: integer
                                port:
                                  description: |-
                                    Port can be an L4 port number, or a name in the form of "http"
                                    or "http-8080".
                                  pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                  type: string
                                protocol:
                                  description: |-
                                    Protocol is the L4 protocol. If omitted or empty, any protocol
                                    matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                    Matching on ICMP is not supported.

                                    Named port specified for a container may narrow this down, but may not
                                    contradict this.
                                  enum:
                                  - TCP
                                  - UDP
                                  - SCTP
                                  - ANY
                                  type: string
                              required:
                              - port
                              type: object
                            maxItems: 40
                            type: array
                          rules:
                            description: |-
                              Rules is a list of additional port level rules which must be met in
                              order for the PortRule to allow the traffic. If omitted or empty,
                              no layer 7 rules are enforced.
                            oneOf:
                            - properties:
                                http: {}
                              required:
                              - http
                            - properties:
                                kafka: {}
                              required:
                              - kafka
                            - properties:
                                dns: {}
                              required:
                              - dns
                            - properties:
                                l7proto: {}
                              required:
                              - l7proto
                            properties:
                              dns:
                                description: DNS-specific rules.
                                items:
                                  description: PortRuleDNS is a list of allowed
                                    DNS lookups.
                                  oneOf:
                                  - properties:
                                      matchName: {}
                                    required:
                                    - matchName
                                  - properties:
                                      matchPattern: {}
                                    required:
                                    - matchPattern
                                  properties:
                                    matchName:
                                      description: |-
                                        MatchName matches literal DNS names. A trailing "." is automatically added
                                        when missing.
                                      maxLength: 255
                                      pattern: ^([-a-zA-Z0-9_]+[.]?)+$
                                      type: string
                                    matchPattern:
                                      description: |-
                                        MatchPattern allows using wildcards to match DNS names. All wildcards are
                                        case insensitive. The wildcards are:
                                        - "*" matches 0 or more DNS valid characters, and may occur anywhere in
                                        the pattern. As a special case a "*" as the leftmost character, without a
                                        following "." matches all subdomains as well as the name to the right.
                                        A trailing "." is automatically added when missing.

                                        Examples:
                                        `*.cilium.io` matches subomains of cilium at that level
                                          www.cilium.io and blog.cilium.io match, cilium.io and google.com do not
                                        `*cilium.io` matches cilium.io and all subdomains ends with "cilium.io"
                                          except those containing "." separator, subcilium.io and sub-cilium.io match,
                                          www.cilium.io and blog.cilium.io does not
                                        sub*.cilium.io matches subdomains of cilium where the subdomain component
                                        begins with "sub"
                                          sub.cilium.io and subdomain.cilium.io match, www.cilium.io,
                                          blog.cilium.io, cilium.io and google.com do not
                                      maxLength: 255
                                      pattern: ^([-a-zA-Z0-9_*]+[.]?)+$
                                      type: string
                                  type: object
                                type: array
                              http:
                                description: HTTP specific rules.
                                items:
                                  description: |-
                                    PortRuleHTTP is a list of HTTP protocol constraints. All fields are
                                    optional, if all fields are empty or missing, the rule does not have any
                                    effect.

                                    All fields of this type are extended POSIX regex as defined by IEEE Std
                                    1003.1, (i.e this follows the egrep/unix syntax, not the perl syntax)
                                    matched against the path of an incoming request. Currently it can contain
                                    characters disallowed from the conventional "path" part of a URL as defined
                                    by RFC 3986.
                                  properties:
                                    headerMatches:
                                      description: |-
                                        HeaderMatches is a list of HTTP headers which must be
                                        present and match against the given values. Mismatch field can be used
                                        to specify what to do when there is no match.
                                      items:
                                        description: |-
                                          HeaderMatch extends the HeaderValue for matching requirement of a
                                          named header field against an immediate string, a secret value, or
                                          a regex.  If none of the optional fields is present, then the
                                          header value is not matched, only presence of the header is enough.
                                        properties:
                                          mismatch:
                                            description: |-
                                              Mismatch identifies what to do in case there is no match. The default is
                                              to drop the request. Otherwise the overall rule is still considered as
                                              matching, but the mismatches are logged in the access log.
                                            enum:
                                            - LOG
                                            - ADD
                                            - DELETE
                                            - REPLACE
                                            type: string
                                          name:
                                            description: Name identifies the header.
                                            minLength: 1
                                            type: string
                                          secret:
                                            description: |-
                                              Secret refers to a secret that contains the value to be matched against.
                                              The secret must only contain one entry. If the referred secret does not
                                              exist, and there is no "Value" specified, the match will fail.
                                            properties:
                                              name:
                                                description: Name is the name of
                                                  the secret.
                                                type: string
                                              namespace:
                                                description: |-
                                                  Namespace is the namespace in which the secret exists. Context of use
                                                  determines the default value if left out (e.g., "default").
                                                type: string
                                            required:
                                            - name
                                            type: object
                                          value:
                                            description: |-
                                              Value matches the exact value of the header. Can be specified either
                                              alone or together with "Secret"; will be used as the header value if the
                                              secret can not be found in the latter case.
                                            type: string
                                        required:
                                        - name
                                        type: object
                                      type: array
                                    headers:
                                      description: |-
                                        Headers is a list of HTTP headers which must be present in the
                                        request. If omitted or empty, requests are allowed regardless of
                                        headers present.
                                      items:
                                        type: string
                                      type: array
                                    host:
                                      description: |-
                                        Host is an extended POSIX regex matched against the host header of a
                                        request. Examples:

                                        - foo.bar.com will match the host fooXbar.com or foo-bar.com
                                        - foo\.bar\.com will only match the host foo.bar.com

                                        If omitted or empty, the value of the host header is ignored.
                                      format: idn-hostname
                                      type: string
                                    method:
                                      description: |-
                                        Method is an extended POSIX regex matched against the method of a
                                        request, e.g. "GET", "POST", "PUT", "PATCH", "DELETE", ...

                                        If omitted or empty, all methods are allowed.
                                      type: string
                                    path:
                                      description: |-
                                        Path is an extended POSIX regex matched against the path of a
                                        request. Currently it can contain characters disallowed from the
                                        conventional "path" part of a URL as defined by RFC 3986.

                                        If omitted or empty, all paths are all allowed.
                                      type: string
                                  type: object
                                type: array
                              kafka:
                                description: Kafka-specific rules.
                                items:
                                  description: |-
                                    PortRule is a list of Kafka protocol constraints. All fields are
                                    optional, if all fields are empty or missing, the rule will match all
                                    Kafka messages.
                                  properties:
                                    apiKey:
                                      description: |-
                                        APIKey is a case-insensitive string matched against the key of a
                                        request, e.g. "produce", "fetch", "createtopic", "deletetopic", et al
                                        Reference: https://kafka.apache.org/protocol#protocol_api_keys

                                        If omitted or empty, and if Role is not specified, then all keys are allowed.
                                      type: string
                                    apiVersion:
                                      description: |-
                                        APIVersion is the version matched against the api version of the
                                        Kafka message. If set, it has to be a string representing a positive
                                        integer.

                                        If omitted or empty, all versions are allowed.
                                      type: string
                                    clientID:
                                      description: |-
                                        ClientID is the client identifier as provided in the request.

                                        From Kafka protocol documentation:
                                        This is a user supplied identifier for the client application. The
                                        user can use any identifier they like and it will be used when
                                        logging errors, monitoring aggregates, etc. For example, one might
                                        want to monitor not just the requests per second overall, but the
                                        number coming from each client application (each of which could
                                        reside on multiple servers). This id acts as a logical grouping
                                        across all requests from a particular client.

                                        If omitted or empty, all client identifiers are allowed.
                                      type: string
                                    role:
                                      description: |-
                                        Role is a case-insensitive string and describes a group of API keys
                                        necessary to perform certain higher-level Kafka operations such as "produce"
                                        or "consume". A Role automatically expands into all APIKeys required
                                        to perform the specified higher-level operation.

                                        The following values are supported:
                                          - "produce": Allow producing to the topics specified in the rule
                                          - "consume": Allow consuming from the topics specified in the rule

                                        This field is incompatible with the APIKey field, i.e APIKey and Role
                                        cannot both be specified in the same rule.

                                        If omitted or empty, and if APIKey is not specified, then all keys are
                                        allowed.
                                      enum:
                                      - produce
                                      - consume
                                      type: string
                                    topic:
                                      description: |-
                                        Topic is the topic name contained in the message. If a Kafka request
                                        contains multiple topics, then all topics must be allowed or the
                                        message will be rejected.

                                        This constraint is ignored if the matched request message type
                                        doesn't contain any topic. Maximum size of Topic can be 249
                                        characters as per recent Kafka spec and allowed characters are
                                        a-z, A-Z, 0-9, -, . and _.

                                        Older Kafka versions had longer topic lengths of 255, but in Kafka 0.10
                                        version the length was changed from 255 to 249. For compatibility
                                        reasons we are using 255.

                                        If omitted or empty, all topics are allowed.
                                      maxLength: 255
                                      type: string
                                  type: object
                                type: array
                              l7:
                                description: Key-value pair rules.
                                items:
                                  additionalProperties:
                                    type: string
                                  description: |-
                                    PortRuleL7 is a list of key-value pairs interpreted by a L7 protocol as
                                    protocol constraints. All fields are optional, if all fields are empty or
                                    missing, the rule does not have any effect.
                                  type: object
                                type: array
                              l7proto:
                                description: Name of the L7 protocol for which the
                                  Key-value pair rules apply.
                                type: string
                            type: object
                          serverNames:
                            description: |-
                              ServerNames is a list of allowed TLS SNI values. If not empty, then
                              TLS must be present and one of the provided SNIs must be indicated in the
                              TLS handshake.
                            items:
                              type: string
                            type: array
                          terminatingTLS:
                            description: |-
                              TerminatingTLS is the TLS context for the connection terminated by
                              the L7 proxy.  For egress policy this specifies the server-side TLS
                              parameters to be applied on the connections originated from the local
                              endpoint and terminated by the L7 proxy. For ingress policy this specifies
                              the server-side TLS parameters to be applied on the connections
                              originated from a remote source and terminated by the L7 proxy.
                            properties:
                              certificate:
                                description: |-
                                  Certificate is the file name or k8s secret item name for the certificate
                                  chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                  item must exist.
                                type: string
                              privateKey:
                                description: |-
                                  PrivateKey is the file name or k8s secret item name for the private key
                                  matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                  exists. If given, the item must exist.
                                type: string
                              secret:
                                description: |-
                                  Secret is the secret that contains the certificates and private key for
                                  the TLS context.
                                  By default, Cilium will search in this secret for the following items:
                                    - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                    - 'tls.crt' - Which represents the public key certificate.
                                    - 'tls.key' - Which represents the private key matching the public key
                                                  certificate.
                                properties:
                                  name:
                                    description: Name is the name of the secret.
                                    type: string
                                  namespace:
                                    description: |-
                                      Namespace is the namespace in which the secret exists. Context of use
                                      determines the default value if left out (e.g., "default").
                                    type: string
                                required:
                                - name
                                type: object
                              trustedCA:
                                description: |-
                                  TrustedCA is the file name or k8s secret item name for the trusted CA.
                                  If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                  exist.
                                type: string
                            required:
                            - secret
                            type: object
                        type: object
                      type: array
                    toRequires:
                      description: |-
                        ToRequires is a list of additional constraints which must be met
                        in order for the selected endpoints to be able to connect to other
                        endpoints. These additional constraints do no by itself grant access
                        privileges and must always be accompanied with at least one matching
                        ToEndpoints.

                        Example:
                        Any Endpoint with the label "team=A" requires any endpoint to which it
                        communicates to also carry the label "team=A".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    toServices:
                      description: |-
                        ToServices is a list of services to which the endpoint subject
                        to the rule is allowed to initiate connections.
                        Currently Cilium only supports toServices for K8s services.
                      items:
                        description: |-
                          Service selects policy targets that are bundled as part of a
                          logical load-balanced service.

                          Currently only Kubernetes-based Services are supported.
                        properties:
                          k8sService:
                            description: K8sService selects service by name and
                              namespace pair
                            properties:
                              namespace:
                                type: string
                              serviceName:
                                type: string
                            type: object
                          k8sServiceSelector:
                            description: K8sServiceSelector selects services by
                              k8s labels and namespace
                            properties:
                              namespace:
                                type: string
                              selector:
                                description: ServiceSelector is a label selector
                                  for k8s services
                                properties:
                                  matchExpressions:
                                    description: matchExpressions is a list of label
                                      selector requirements. The requirements are
                                      ANDed.
                                    items:
                                      description: |-
                                        A label selector requirement is a selector that contains values, a key, and an operator that
                                        relates the key and values.
                                      properties:
                                        key:
                                          description: key is the label key that
                                            the selector applies to.
                                          type: string
                                        operator:
                                          description: |-
                                            operator represents a key's relationship to a set of values.
                                            Valid operators are In, NotIn, Exists and DoesNotExist.
                                          enum:
                                          - In
                                          - NotIn
                                          - Exists
                                          - DoesNotExist
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
                                      description: MatchLabelsValue represents the
                                        value from the MatchLabels {key,value} pair.
                                      maxLength: 63
                                      pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                      type: string
                                    description: |-
                                      matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                      map is equivalent to an element of matchExpressions, whose key field is "key", the
                                      operator is "In", and the values array contains only "value". The requirements are ANDed.
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                            required:
                            - selector
                            type: object
                        type: object
                      type: array
                  type: object
                type: array
              egressDeny:
                description: |-
                  EgressDeny is a list of EgressDenyRule which are enforced at egress.
                  Any rule inserted here will be denied regardless of the allowed egress
                  rules in the 'egress' field.
                  If omitted or empty, this rule does not apply at egress.
                items:
                  description: |-
                    EgressDenyRule contains all rule types which can be applied at egress, i.e.
                    network traffic that originates inside the endpoint and exits the endpoint
                    selected by the endpointSelector.

                      - All members of this structure are optional. If omitted or empty, the
                        member will have no effect on the rule.

                      - If multiple members of the structure are specified, then all members
                        must match in order for the rule to take effect. The exception to this
                        rule is the ToRequires member; the effects of any Requires field in any
                        rule will apply to all other rules as well.

                      - ToEndpoints, ToCIDR, ToCIDRSet, ToEntities, ToServices and ToGroups are
                        mutually exclusive. Only one of these members may be present within an
                        individual rule.
                  properties:
                    icmps:
                      description: |-
                        ICMPs is a list of ICMP rule identified by type number
                        which the endpoint subject to the rule is not allowed to connect to.

                        Example:
                        Any endpoint with the label "app=httpd" is not allowed to initiate
                        type 8 ICMP connections.
                      items:
                        description: ICMPRule is a list of ICMP fields.
                        properties:
                          fields:
                            description: Fields is a list of ICMP fields.
                            items:
                              description: ICMPField is a ICMP field.
                              properties:
                                family:
                                  default: IPv4
                                  description: |-
                                    Family is a IP address version.
                                    Currently, we support `IPv4` and `IPv6`.
                                    `IPv4` is set as default.
                                  enum:
                                  - IPv4
                                  - IPv6
                                  type: string
                                type:
                                  anyOf:
                                  - type: integer
                                  - type: string
                                  description: "Type is a ICMP-type.\nIt should
                                    be an 8bit code (0-255), or it's CamelCase name
                                    (for example, \"EchoReply\").\nAllowed ICMP
                                    types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                    | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                    | RouterSelection | TimeExceeded | ParameterProblem
                                    |\n\t\t\t Timestamp | TimestampReply | Photuris
                                    | ExtendedEcho Request | ExtendedEcho Reply\n
                                    \   Ipv6: DestinationUnreachable | PacketTooBig
                                    | TimeExceeded | ParameterProblem |\n\t\t\t
                                    EchoRequest | EchoReply | MulticastListenerQuery|
                                    MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                    | RouterSolicitation | RouterAdvertisement |
                                    NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                    | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                    |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                    | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                    HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                    | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                    | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                    |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                  pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                    Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                  x-kubernetes-int-or-string: true
                              required:
                              - type
                              type: object
                            maxItems: 40
                            type: array
                        type: object
                      type: array
                    toCIDR:
                      description: |-
                        ToCIDR is a list of IP blocks which the endpoint subject to the rule
                        is allowed to initiate connections. Only connections destined for
                        outside of the cluster and not targeting the host will be subject
                        to CIDR rules.  This will match on the destination IP address of
                        outgoing connections. Adding a prefix into ToCIDR or into ToCIDRSet
                        with no ExcludeCIDRs is equivalent. Overlaps are allowed between
                        ToCIDR and ToCIDRSet.

                        Example:
                        Any endpoint with the label "app=database-proxy" is allowed to
                        initiate connections to 10.2.3.0/24
                      items:
                        description: |-
                          CIDR specifies a block of IP addresses.
                          Example: 192.0.2.1/32
                        format: cidr
                        type: string
                      type: array
                    toCIDRSet:
                      description: |-
                        ToCIDRSet is a list of IP blocks which the endpoint subject to the rule
                        is allowed to initiate connections to in addition to connections
                        which are allowed via ToEndpoints, along with a list of subnets contained
                        within their corresponding IP block to which traffic should not be
                        allowed. This will match on the destination IP address of outgoing
                        connections. Adding a prefix into ToCIDR or into ToCIDRSet with no
                        ExcludeCIDRs is equivalent. Overlaps are allowed between ToCIDR and
                        ToCIDRSet.

                        Example:
                        Any endpoint with the label "app=database-proxy" is allowed to
                        initiate connections to 10.2.3.0/24 except from IPs in subnet 10.2.3.0/28.
                      items:
                        description: |-
                          CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                          communication  is allowed, along with an optional list of subnets within that
                          CIDR prefix to/from which outside communication is not allowed.
                        oneOf:
                        - properties:
                            cidr: {}
                          required:
                          - cidr
                        - properties:
                            cidrGroupRef: {}
                          required:
                          - cidrGroupRef
                        - properties:
                            cidrGroupSelector: {}
                          required:
                          - cidrGroupSelector
                        properties:
                          cidr:
                            description: CIDR is a CIDR prefix / IP Block.
                            format: cidr
                            type: string
                          cidrGroupRef:
                            description: |-
                              CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                              A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                              the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                              connections from.
                            maxLength: 253
                            pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                            type: string
                          cidrGroupSelector:
                            description: |-
                              CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                              rather than by name.
                            properties:
                              matchExpressions:
                                description: matchExpressions is a list of label
                                  selector requirements. The requirements are ANDed.
                                items:
                                  description: |-
                                    A label selector requirement is a selector that contains values, a key, and an operator that
                                    relates the key and values.
                                  properties:
                                    key:
                                      description: key is the label key that the
                                        selector applies to.
                                      type: string
                                    operator:
                                      description: |-
                                        operator represents a key's relationship to a set of values.
                                        Valid operators are In, NotIn, Exists and DoesNotExist.
                                      enum:
                                      - In
                                      - NotIn
                                      - Exists
                                      - DoesNotExist
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
                                  description: MatchLabelsValue represents the value
                                    from the MatchLabels {key,value} pair.
                                  maxLength: 63
                                  pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                  type: string
                                description: |-
                                  matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                  map is equivalent to an element of matchExpressions, whose key field is "key", the
                                  operator is "In", and the values array contains only "value". The requirements are ANDed.
                                type: object
                            type: object
                            x-kubernetes-map-type: atomic
                          except:
                            description: |-
                              ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                              is not allowed to initiate connections to. These CIDR prefixes should be
                              contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                              supported yet.
                              These exceptions are only applied to the Cidr in this CIDRRule, and do not
                              apply to any other CIDR prefixes in any other CIDRRules.
                            items:
                              description: |-
                                CIDR specifies a block of IP addresses.
                                Example: 192.0.2.1/32
                              format: cidr
                              type: string
                            type: array
                        type: object
                      type: array
                    toEndpoints:
                      description: |-
                        ToEndpoints is a list of endpoints identified by an EndpointSelector to
                        which the endpoints subject to the rule are allowed to communicate.

                        Example:
                        Any endpoint with the label "role=frontend" can communicate with any
                        endpoint carrying the label "role=backend".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    toEntities:
                      description: |-
                        ToEntities is a list of special entities to which the endpoint subject
                        to the rule is allowed to initiate connections. Supported entities are
                        `world`, `cluster`,`host`,`remote-node`,`kube-apiserver`, `init`,
                        `health`,`unmanaged` and `all`.
                      items:
                        description: |-
                          Entity specifies the class of receiver/sender endpoints that do not have
                          individual identities.  Entities are used to describe "outside of cluster",
                          "host", etc.
                        enum:
                        - all
                        - world
                        - cluster
                        - host
                        - init
                        - ingress
                        - unmanaged
                        - remote-node
                        - health
                        - none
                        - kube-apiserver
                        type: string
                      type: array
                    toGroups:
                      description: |-
                        ToGroups is a directive that allows the integration with multiple outside
                        providers. Currently, only AWS is supported, and the rule can select by
                        multiple sub directives:

                        Example:
                        toGroups:
                        - aws:
                            securityGroupsIds:
                            - 'sg-XXXXXXXXXXXXX'
                      items:
                        description: |-
                          Groups structure to store all kinds of new integrations that needs a new
                          derivative policy.
                        properties:
                          aws:
                            description: AWSGroup is an structure that can be used
                              to whitelisting information from AWS integration
                            properties:
                              labels:
                                additionalProperties:
                                  type: string
                                type: object
                              region:
                                type: string
                              securityGroupsIds:
                                items:
                                  type: string
                                type: array
                              securityGroupsNames:
                                items:
                                  type: string
                                type: array
                            type: object
                        type: object
                      type: array
                    toNodes:
                      description: |-
                        ToNodes is a list of nodes identified by an
                        EndpointSelector to which endpoints subject to the rule is allowed to communicate.
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    toPorts:
                      description: |-
                        ToPorts is a list of destination ports identified by port number and
                        protocol which the endpoint subject to the rule is not allowed to connect
                        to.

                        Example:
                        Any endpoint with the label "role=frontend" is not allowed to initiate
                        connections to destination port 8080/tcp
                      items:
                        description: |-
                          PortDenyRule is a list of ports/protocol that should be used for deny
                          policies. This structure lacks the L7Rules since it's not supported in deny
                          policies.
                        properties:
                          ports:
                            description: Ports is a list of L4 port/protocol
                            items:
                              description: PortProtocol specifies an L4 port with
                                an optional transport protocol
                              properties:
                                endPort:
                                  description: EndPort can only be an L4 port number.
                                  format: int32
                                  maximum: 65535
                                  minimum: 0
                                  type: integer
                                port:
                                  description: |-
                                    Port can be an L4 port number, or a name in the form of "http"
                                    or "http-8080".
                                  pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                  type: string
                                protocol:
                                  description: |-
                                    Protocol is the L4 protocol. If omitted or empty, any protocol
                                    matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                    Matching on ICMP is not supported.

                                    Named port specified for a container may narrow this down, but may not
                                    contradict this.
                                  enum:
                                  - TCP
                                  - UDP
                                  - SCTP
                                  - ANY
                                  type: string
                              required:
                              - port
                              type: object
                            type: array
                        type: object
                      type: array
                    toRequires:
                      description: |-
                        ToRequires is a list of additional constraints which must be met
                        in order for the selected endpoints to be able to connect to other
                        endpoints. These additional constraints do no by itself grant access
                        privileges and must always be accompanied with at least one matching
                        ToEndpoints.

                        Example:
                        Any Endpoint with the label "team=A" requires any endpoint to which it
                        communicates to also carry the label "team=A".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    toServices:
                      description: |-
                        ToServices is a list of services to which the endpoint subject
                        to the rule is allowed to initiate connections.
                        Currently Cilium only supports toServices for K8s services.
                      items:
                        description: |-
                          Service selects policy targets that are bundled as part of a
                          logical load-balanced service.

                          Currently only Kubernetes-based Services are supported.
                        properties:
                          k8sService:
                            description: K8sService selects service by name and
                              namespace pair
                            properties:
                              namespace:
                                type: string
                              serviceName:
                                type: string
                            type: object
                          k8sServiceSelector:
                            description: K8sServiceSelector selects services by
                              k8s labels and namespace
                            properties:
                              namespace:
                                type: string
                              selector:
                                description: ServiceSelector is a label selector
                                  for k8s services
                                properties:
                                  matchExpressions:
                                    description: matchExpressions is a list of label
                                      selector requirements. The requirements are
                                      ANDed.
                                    items:
                                      description: |-
                                        A label selector requirement is a selector that contains values, a key, and an operator that
                                        relates the key and values.
                                      properties:
                                        key:
                                          description: key is the label key that
                                            the selector applies to.
                                          type: string
                                        operator:
                                          description: |-
                                            operator represents a key's relationship to a set of values.
                                            Valid operators are In, NotIn, Exists and DoesNotExist.
                                          enum:
                                          - In
                                          - NotIn
                                          - Exists
                                          - DoesNotExist
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
                                      description: MatchLabelsValue represents the
                                        value from the MatchLabels {key,value} pair.
                                      maxLength: 63
                                      pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                      type: string
                                    description: |-
                                      matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                      map is equivalent to an element of matchExpressions, whose key field is "key", the
                                      operator is "In", and the values array contains only "value". The requirements are ANDed.
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                            required:
                            - selector
                            type: object
                        type: object
                      type: array
                  type: object
                type: array
              enableDefaultDeny:
                description: |-
                  EnableDefaultDeny determines whether this policy configures the
                  subject endpoint(s) to have a default deny mode. If enabled,
                  this causes all traffic not explicitly allowed by a network policy
                  to be dropped.

                  If not specified, the default is true for each traffic direction
                  that has rules, and false otherwise. For example, if a policy
                  only has Ingress or IngressDeny rules, then the default for
                  ingress is true and egress is false.

                  If multiple policies apply to an endpoint, that endpoint's default deny
                  will be enabled if any policy requests it.

                  This is useful for creating broad-based network policies that will not
                  cause endpoints to enter default-deny mode.
                properties:
                  egress:
                    description: |-
                      Whether or not the endpoint should have a default-deny rule applied
                      to egress traffic.
                    type: boolean
                  ingress:
                    description: |-
                      Whether or not the endpoint should have a default-deny rule applied
                      to ingress traffic.
                    type: boolean
                type: object
              endpointSelector:
                description: |-
                  EndpointSelector selects all endpoints which should be subject to
                  this rule. EndpointSelector and NodeSelector cannot be both empty and
                  are mutually exclusive.
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
                          enum:
                          - In
                          - NotIn
                          - Exists
                          - DoesNotExist
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
                      description: MatchLabelsValue represents the value from the
                        MatchLabels {key,value} pair.
                      maxLength: 63
                      pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                      type: string
                    description: |-
                      matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                      map is equivalent to an element of matchExpressions, whose key field is "key", the
                      operator is "In", and the values array contains only "value". The requirements are ANDed.
                    type: object
                type: object
                x-kubernetes-map-type: atomic
              ingress:
                description: |-
                  Ingress is a list of IngressRule which are enforced at ingress.
                  If omitted or empty, this rule does not apply at ingress.
                items:
                  description: |-
                    IngressRule contains all rule types which can be applied at ingress,
                    i.e. network traffic that originates outside of the endpoint and
                    is entering the endpoint selected by the endpointSelector.

                      - All members of this structure are optional. If omitted or empty, the
                        member will have no effect on the rule.

                      - If multiple members are set, all of them need to match in order for
                        the rule to take effect. The exception to this rule is FromRequires field;
                        the effects of any Requires field in any rule will apply to all other
                        rules as well.

                      - FromEndpoints, FromCIDR, FromCIDRSet and FromEntities are mutually
                        exclusive. Only one of these members may be present within an individual
                        rule.
                  properties:
                    authentication:
                      description: Authentication is the required authentication
                        type for the allowed traffic, if any.
                      properties:
                        mode:
                          description: Mode is the required authentication mode
                            for the allowed traffic, if any.
                          enum:
                          - disabled
                          - required
                          - test-always-fail
                          type: string
                      required:
                      - mode
                      type: object
                    fromCIDR:
                      description: |-
                        FromCIDR is a list of IP blocks which the endpoint subject to the
                        rule is allowed to receive connections from. Only connections which
                        do *not* originate from the cluster or from the local host are subject
                        to CIDR rules. In order to allow in-cluster connectivity, use the
                        FromEndpoints field.  This will match on the source IP address of
                        incoming connections. Adding  a prefix into FromCIDR or into
                        FromCIDRSet with no ExcludeCIDRs is  equivalent.  Overlaps are
                        allowed between FromCIDR and FromCIDRSet.

                        Example:
                        Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                        connections from 10.3.9.1
                      items:
                        description: |-
                          CIDR specifies a block of IP addresses.
                          Example: 192.0.2.1/32
                        format: cidr
                        type: string
                      type: array
                    fromCIDRSet:
                      description: |-
                        FromCIDRSet is a list of IP blocks which the endpoint subject to the
                        rule is allowed to receive connections from in addition to FromEndpoints,
                        along with a list of subnets contained within their corresponding IP block
                        from which traffic should not be allowed.
                        This will match on the source IP address of incoming connections. Adding
                        a prefix into FromCIDR or into FromCIDRSet with no ExcludeCIDRs is
                        equivalent. Overlaps are allowed between FromCIDR and FromCIDRSet.

                        Example:
                        Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                        connections from 10.0.0.0/8 except from IPs in subnet 10.96.0.0/12.
                      items:
                        description: |-
                          CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                          communication  is allowed, along with an optional list of subnets within that
                          CIDR prefix to/from which outside communication is not allowed.
                        oneOf:
                        - properties:
                            cidr: {}
                          required:
                          - cidr
                        - properties:
                            cidrGroupRef: {}
                          required:
                          - cidrGroupRef
                        - properties:
                            cidrGroupSelector: {}
                          required:
                          - cidrGroupSelector
                        properties:
                          cidr:
                            description: CIDR is a CIDR prefix / IP Block.
                            format: cidr
                            type: string
                          cidrGroupRef:
                            description: |-
                              CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                              A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                              the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                              connections from.
                            maxLength: 253
                            pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                            type: string
                          cidrGroupSelector:
                            description: |-
                              CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                              rather than by name.
                            properties:
                              matchExpressions:
                                description: matchExpressions is a list of label
                                  selector requirements. The requirements are ANDed.
                                items:
                                  description: |-
                                    A label selector requirement is a selector that contains values, a key, and an operator that
                                    relates the key and values.
                                  properties:
                                    key:
                                      description: key is the label key that the
                                        selector applies to.
                                      type: string
                                    operator:
                                      description: |-
                                        operator represents a key's relationship to a set of values.
                                        Valid operators are In, NotIn, Exists and DoesNotExist.
                                      enum:
                                      - In
                                      - NotIn
                                      - Exists
                                      - DoesNotExist
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
                                  description: MatchLabelsValue represents the value
                                    from the MatchLabels {key,value} pair.
                                  maxLength: 63
                                  pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                  type: string
                                description: |-
                                  matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                  map is equivalent to an element of matchExpressions, whose key field is "key", the
                                  operator is "In", and the values array contains only "value". The requirements are ANDed.
                                type: object
                            type: object
                            x-kubernetes-map-type: atomic
                          except:
                            description: |-
                              ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                              is not allowed to initiate connections to. These CIDR prefixes should be
                              contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                              supported yet.
                              These exceptions are only applied to the Cidr in this CIDRRule, and do not
                              apply to any other CIDR prefixes in any other CIDRRules.
                            items:
                              description: |-
                                CIDR specifies a block of IP addresses.
                                Example: 192.0.2.1/32
                              format: cidr
                              type: string
                            type: array
                        type: object
                      type: array
                    fromEndpoints:
                      description: |-
                        FromEndpoints is a list of endpoints identified by an
                        EndpointSelector which are allowed to communicate with the endpoint
                        subject to the rule.

                        Example:
                        Any endpoint with the label "role=backend" can be consumed by any
                        endpoint carrying the label "role=frontend".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    fromEntities:
                      description: |-
                        FromEntities is a list of special entities which the endpoint subject
                        to the rule is allowed to receive connections from. Supported entities are
                        `world`, `cluster` and `host`
                      items:
                        description: |-
                          Entity specifies the class of receiver/sender endpoints that do not have
                          individual identities.  Entities are used to describe "outside of cluster",
                          "host", etc.
                        enum:
                        - all
                        - world
                        - cluster
                        - host
                        - init
                        - ingress
                        - unmanaged
                        - remote-node
                        - health
                        - none
                        - kube-apiserver
                        type: string
                      type: array
                    fromGroups:
                      description: |-
                        FromGroups is a directive that allows the integration with multiple outside
                        providers. Currently, only AWS is supported, and the rule can select by
                        multiple sub directives:

                        Example:
                        FromGroups:
                        - aws:
                            securityGroupsIds:
                            - 'sg-XXXXXXXXXXXXX'
                      items:
                        description: |-
                          Groups structure to store all kinds of new integrations that needs a new
                          derivative policy.
                        properties:
                          aws:
                            description: AWSGroup is an structure that can be used
                              to whitelisting information from AWS integration
                            properties:
                              labels:
                                additionalProperties:
                                  type: string
                                type: object
                              region:
                                type: string
                              securityGroupsIds:
                                items:
                                  type: string
                                type: array
                              securityGroupsNames:
                                items:
                                  type: string
                                type: array
                            type: object
                        type: object
                      type: array
                    fromNodes:
                      description: |-
                        FromNodes is a list of nodes identified by an
                        EndpointSelector which are allowed to communicate with the endpoint
                        subject to the rule.
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    fromRequires:
                      description: |-
                        FromRequires is a list of additional constraints which must be met
                        in order for the selected endpoints to be reachable. These
                        additional constraints do no by itself grant access privileges and
                        must always be accompanied with at least one matching FromEndpoints.

                        Example:
                        Any Endpoint with the label "team=A" requires consuming endpoint
                        to also carry the label "team=A".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    icmps:
                      description: |-
                        ICMPs is a list of ICMP rule identified by type number
                        which the endpoint subject to the rule is allowed to
                        receive connections on.

                        Example:
                        Any endpoint with the label "app=httpd" can only accept incoming
                        type 8 ICMP connections.
                      items:
                        description: ICMPRule is a list of ICMP fields.
                        properties:
                          fields:
                            description: Fields is a list of ICMP fields.
                            items:
                              description: ICMPField is a ICMP field.
                              properties:
                                family:
                                  default: IPv4
                                  description: |-
                                    Family is a IP address version.
                                    Currently, we support `IPv4` and `IPv6`.
                                    `IPv4` is set as default.
                                  enum:
                                  - IPv4
                                  - IPv6
                                  type: string
                                type:
                                  anyOf:
                                  - type: integer
                                  - type: string
                                  description: "Type is a ICMP-type.\nIt should
                                    be an 8bit code (0-255), or it's CamelCase name
                                    (for example, \"EchoReply\").\nAllowed ICMP
                                    types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                    | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                    | RouterSelection | TimeExceeded | ParameterProblem
                                    |\n\t\t\t Timestamp | TimestampReply | Photuris
                                    | ExtendedEcho Request | ExtendedEcho Reply\n
                                    \   Ipv6: DestinationUnreachable | PacketTooBig
                                    | TimeExceeded | ParameterProblem |\n\t\t\t
                                    EchoRequest | EchoReply | MulticastListenerQuery|
                                    MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                    | RouterSolicitation | RouterAdvertisement |
                                    NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                    | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                    |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                    | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                    HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                    | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                    | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                    |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                  pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                    Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                  x-kubernetes-int-or-string: true
                              required:
                              - type
                              type: object
                            maxItems: 40
                            type: array
                        type: object
                      type: array
                    toPorts:
                      description: |-
                        ToPorts is a list of destination ports identified by port number and
                        protocol which the endpoint subject to the rule is allowed to
                        receive connections on.

                        Example:
                        Any endpoint with the label "app=httpd" can only accept incoming
                        connections on port 80/tcp.
                      items:
                        description: |-
                          PortRule is a list of ports/protocol combinations with optional Layer 7
                          rules which must be met.
                        properties:
                          listener:
                            description: |-
                              listener specifies the name of a custom Envoy listener to which this traffic should be
                              redirected to.
                            properties:
                              envoyConfig:
                                description: |-
                                  EnvoyConfig is a reference to the CEC or CCEC resource in which
                                  the listener is defined.
                                properties:
                                  kind:
                                    description: |-
                                      Kind is the resource type being referred to. Defaults to CiliumEnvoyConfig or
                                      CiliumClusterwideEnvoyConfig for CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy,
                                      respectively. The only case this is currently explicitly needed is when referring to a
                                      CiliumClusterwideEnvoyConfig from CiliumNetworkPolicy, as using a namespaced listener
                                      from a cluster scoped policy is not allowed.
                                    enum:
                                    - CiliumEnvoyConfig
                                    - CiliumClusterwideEnvoyConfig
                                    type: string
                                  name:
                                    description: |-
                                      Name is the resource name of the CiliumEnvoyConfig or CiliumClusterwideEnvoyConfig where
                                      the listener is defined in.
                                    minLength: 1
                                    type: string
                                required:
                                - name
                                type: object
                              name:
                                description: Name is the name of the listener.
                                minLength: 1
                                type: string
                              priority:
                                description: |-
                                  Priority for this Listener that is used when multiple rules would apply different
                                  listeners to a policy map entry. Behavior of this is implementation dependent.
                                maximum: 100
                                minimum: 1
                                type: integer
                            required:
                            - envoyConfig
                            - name
                            type: object
                          originatingTLS:
                            description: |-
                              OriginatingTLS is the TLS context for the connections originated by
                              the L7 proxy.  For egress policy this specifies the client-side TLS
                              parameters for the upstream connection originating from the L7 proxy
                              to the remote destination. For ingress policy this specifies the
                              client-side TLS parameters for the connection from the L7 proxy to
                              the local endpoint.
                            properties:
                              certificate:
                                description: |-
                                  Certificate is the file name or k8s secret item name for the certificate
                                  chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                  item must exist.
                                type: string
                              privateKey:
                                description: |-
                                  PrivateKey is the file name or k8s secret item name for the private key
                                  matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                  exists. If given, the item must exist.
                                type: string
                              secret:
                                description: |-
                                  Secret is the secret that contains the certificates and private key for
                                  the TLS context.
                                  By default, Cilium will search in this secret for the following items:
                                    - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                    - 'tls.crt' - Which represents the public key certificate.
                                    - 'tls.key' - Which represents the private key matching the public key
                                                  certificate.
                                properties:
                                  name:
                                    description: Name is the name of the secret.
                                    type: string
                                  namespace:
                                    description: |-
                                      Namespace is the namespace in which the secret exists. Context of use
                                      determines the default value if left out (e.g., "default").
                                    type: string
                                required:
                                - name
                                type: object
                              trustedCA:
                                description: |-
                                  TrustedCA is the file name or k8s secret item name for the trusted CA.
                                  If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                  exist.
                                type: string
                            required:
                            - secret
                            type: object
                          ports:
                            description: Ports is a list of L4 port/protocol
                            items:
                              description: PortProtocol specifies an L4 port with
                                an optional transport protocol
                              properties:
                                endPort:
                                  description: EndPort can only be an L4 port number.
                                  format: int32
                                  maximum: 65535
                                  minimum: 0
                                  type: integer
                                port:
                                  description: |-
                                    Port can be an L4 port number, or a name in the form of "http"
                                    or "http-8080".
                                  pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                  type: string
                                protocol:
                                  description: |-
                                    Protocol is the L4 protocol. If omitted or empty, any protocol
                                    matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                    Matching on ICMP is not supported.

                                    Named port specified for a container may narrow this down, but may not
                                    contradict this.
                                  enum:
                                  - TCP
                                  - UDP
                                  - SCTP
                                  - ANY
                                  type: string
                              required:
                              - port
                              type: object
                            maxItems: 40
                            type: array
                          rules:
                            description: |-
                              Rules is a list of additional port level rules which must be met in
                              order for the PortRule to allow the traffic. If omitted or empty,
                              no layer 7 rules are enforced.
                            oneOf:
                            - properties:
                                http: {}
                              required:
                              - http
                            - properties:
                                kafka: {}
                              required:
                              - kafka
                            - properties:
                                dns: {}
                              required:
                              - dns
                            - properties:
                                l7proto: {}
                              required:
                              - l7proto
                            properties:
                              dns:
                                description: DNS-specific rules.
                                items:
                                  description: PortRuleDNS is a list of allowed
                                    DNS lookups.
                                  oneOf:
                                  - properties:
                                      matchName: {}
                                    required:
                                    - matchName
                                  - properties:
                                      matchPattern: {}
                                    required:
                                    - matchPattern
                                  properties:
                                    matchName:
                                      description: |-
                                        MatchName matches literal DNS names. A trailing "." is automatically added
                                        when missing.
                                      maxLength: 255
                                      pattern: ^([-a-zA-Z0-9_]+[.]?)+$
                                      type: string
                                    matchPattern:
                                      description: |-
                                        MatchPattern allows using wildcards to match DNS names. All wildcards are
                                        case insensitive. The wildcards are:
                                        - "*" matches 0 or more DNS valid characters, and may occur anywhere in
                                        the pattern. As a special case a "*" as the leftmost character, without a
                                        following "." matches all subdomains as well as the name to the right.
                                        A trailing "." is automatically added when missing.

                                        Examples:
                                        `*.cilium.io` matches subomains of cilium at that level
                                          www.cilium.io and blog.cilium.io match, cilium.io and google.com do not
                                        `*cilium.io` matches cilium.io and all subdomains ends with "cilium.io"
                                          except those containing "." separator, subcilium.io and sub-cilium.io match,
                                          www.cilium.io and blog.cilium.io does not
                                        sub*.cilium.io matches subdomains of cilium where the subdomain component
                                        begins with "sub"
                                          sub.cilium.io and subdomain.cilium.io match, www.cilium.io,
                                          blog.cilium.io, cilium.io and google.com do not
                                      maxLength: 255
                                      pattern: ^([-a-zA-Z0-9_*]+[.]?)+$
                                      type: string
                                  type: object
                                type: array
                              http:
                                description: HTTP specific rules.
                                items:
                                  description: |-
                                    PortRuleHTTP is a list of HTTP protocol constraints. All fields are
                                    optional, if all fields are empty or missing, the rule does not have any
                                    effect.

                                    All fields of this type are extended POSIX regex as defined by IEEE Std
                                    1003.1, (i.e this follows the egrep/unix syntax, not the perl syntax)
                                    matched against the path of an incoming request. Currently it can contain
                                    characters disallowed from the conventional "path" part of a URL as defined
                                    by RFC 3986.
                                  properties:
                                    headerMatches:
                                      description: |-
                                        HeaderMatches is a list of HTTP headers which must be
                                        present and match against the given values. Mismatch field can be used
                                        to specify what to do when there is no match.
                                      items:
                                        description: |-
                                          HeaderMatch extends the HeaderValue for matching requirement of a
                                          named header field against an immediate string, a secret value, or
                                          a regex.  If none of the optional fields is present, then the
                                          header value is not matched, only presence of the header is enough.
                                        properties:
                                          mismatch:
                                            description: |-
                                              Mismatch identifies what to do in case there is no match. The default is
                                              to drop the request. Otherwise the overall rule is still considered as
                                              matching, but the mismatches are logged in the access log.
                                            enum:
                                            - LOG
                                            - ADD
                                            - DELETE
                                            - REPLACE
                                            type: string
                                          name:
                                            description: Name identifies the header.
                                            minLength: 1
                                            type: string
                                          secret:
                                            description: |-
                                              Secret refers to a secret that contains the value to be matched against.
                                              The secret must only contain one entry. If the referred secret does not
                                              exist, and there is no "Value" specified, the match will fail.
                                            properties:
                                              name:
                                                description: Name is the name of
                                                  the secret.
                                                type: string
                                              namespace:
                                                description: |-
                                                  Namespace is the namespace in which the secret exists. Context of use
                                                  determines the default value if left out (e.g., "default").
                                                type: string
                                            required:
                                            - name
                                            type: object
                                          value:
                                            description: |-
                                              Value matches the exact value of the header. Can be specified either
                                              alone or together with "Secret"; will be used as the header value if the
                                              secret can not be found in the latter case.
                                            type: string
                                        required:
                                        - name
                                        type: object
                                      type: array
                                    headers:
                                      description: |-
                                        Headers is a list of HTTP headers which must be present in the
                                        request. If omitted or empty, requests are allowed regardless of
                                        headers present.
                                      items:
                                        type: string
                                      type: array
                                    host:
                                      description: |-
                                        Host is an extended POSIX regex matched against the host header of a
                                        request. Examples:

                                        - foo.bar.com will match the host fooXbar.com or foo-bar.com
                                        - foo\.bar\.com will only match the host foo.bar.com

                                        If omitted or empty, the value of the host header is ignored.
                                      format: idn-hostname
                                      type: string
                                    method:
                                      description: |-
                                        Method is an extended POSIX regex matched against the method of a
                                        request, e.g. "GET", "POST", "PUT", "PATCH", "DELETE", ...

                                        If omitted or empty, all methods are allowed.
                                      type: string
                                    path:
                                      description: |-
                                        Path is an extended POSIX regex matched against the path of a
                                        request. Currently it can contain characters disallowed from the
                                        conventional "path" part of a URL as defined by RFC 3986.

                                        If omitted or empty, all paths are all allowed.
                                      type: string
                                  type: object
                                type: array
                              kafka:
                                description: Kafka-specific rules.
                                items:
                                  description: |-
                                    PortRule is a list of Kafka protocol constraints. All fields are
                                    optional, if all fields are empty or missing, the rule will match all
                                    Kafka messages.
                                  properties:
                                    apiKey:
                                      description: |-
                                        APIKey is a case-insensitive string matched against the key of a
                                        request, e.g. "produce", "fetch", "createtopic", "deletetopic", et al
                                        Reference: https://kafka.apache.org/protocol#protocol_api_keys

                                        If omitted or empty, and if Role is not specified, then all keys are allowed.
                                      type: string
                                    apiVersion:
                                      description: |-
                                        APIVersion is the version matched against the api version of the
                                        Kafka message. If set, it has to be a string representing a positive
                                        integer.

                                        If omitted or empty, all versions are allowed.
                                      type: string
                                    clientID:
                                      description: |-
                                        ClientID is the client identifier as provided in the request.

                                        From Kafka protocol documentation:
                                        This is a user supplied identifier for the client application. The
                                        user can use any identifier they like and it will be used when
                                        logging errors, monitoring aggregates, etc. For example, one might
                                        want to monitor not just the requests per second overall, but the
                                        number coming from each client application (each of which could
                                        reside on multiple servers). This id acts as a logical grouping
                                        across all requests from a particular client.

                                        If omitted or empty, all client identifiers are allowed.
                                      type: string
                                    role:
                                      description: |-
                                        Role is a case-insensitive string and describes a group of API keys
                                        necessary to perform certain higher-level Kafka operations such as "produce"
                                        or "consume". A Role automatically expands into all APIKeys required
                                        to perform the specified higher-level operation.

                                        The following values are supported:
                                          - "produce": Allow producing to the topics specified in the rule
                                          - "consume": Allow consuming from the topics specified in the rule

                                        This field is incompatible with the APIKey field, i.e APIKey and Role
                                        cannot both be specified in the same rule.

                                        If omitted or empty, and if APIKey is not specified, then all keys are
                                        allowed.
                                      enum:
                                      - produce
                                      - consume
                                      type: string
                                    topic:
                                      description: |-
                                        Topic is the topic name contained in the message. If a Kafka request
                                        contains multiple topics, then all topics must be allowed or the
                                        message will be rejected.

                                        This constraint is ignored if the matched request message type
                                        doesn't contain any topic. Maximum size of Topic can be 249
                                        characters as per recent Kafka spec and allowed characters are
                                        a-z, A-Z, 0-9, -, . and _.

                                        Older Kafka versions had longer topic lengths of 255, but in Kafka 0.10
                                        version the length was changed from 255 to 249. For compatibility
                                        reasons we are using 255.

                                        If omitted or empty, all topics are allowed.
                                      maxLength: 255
                                      type: string
                                  type: object
                                type: array
                              l7:
                                description: Key-value pair rules.
                                items:
                                  additionalProperties:
                                    type: string
                                  description: |-
                                    PortRuleL7 is a list of key-value pairs interpreted by a L7 protocol as
                                    protocol constraints. All fields are optional, if all fields are empty or
                                    missing, the rule does not have any effect.
                                  type: object
                                type: array
                              l7proto:
                                description: Name of the L7 protocol for which the
                                  Key-value pair rules apply.
                                type: string
                            type: object
                          serverNames:
                            description: |-
                              ServerNames is a list of allowed TLS SNI values. If not empty, then
                              TLS must be present and one of the provided SNIs must be indicated in the
                              TLS handshake.
                            items:
                              type: string
                            type: array
                          terminatingTLS:
                            description: |-
                              TerminatingTLS is the TLS context for the connection terminated by
                              the L7 proxy.  For egress policy this specifies the server-side TLS
                              parameters to be applied on the connections originated from the local
                              endpoint and terminated by the L7 proxy. For ingress policy this specifies
                              the server-side TLS parameters to be applied on the connections
                              originated from a remote source and terminated by the L7 proxy.
                            properties:
                              certificate:
                                description: |-
                                  Certificate is the file name or k8s secret item name for the certificate
                                  chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                  item must exist.
                                type: string
                              privateKey:
                                description: |-
                                  PrivateKey is the file name or k8s secret item name for the private key
                                  matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                  exists. If given, the item must exist.
                                type: string
                              secret:
                                description: |-
                                  Secret is the secret that contains the certificates and private key for
                                  the TLS context.
                                  By default, Cilium will search in this secret for the following items:
                                    - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                    - 'tls.crt' - Which represents the public key certificate.
                                    - 'tls.key' - Which represents the private key matching the public key
                                                  certificate.
                                properties:
                                  name:
                                    description: Name is the name of the secret.
                                    type: string
                                  namespace:
                                    description: |-
                                      Namespace is the namespace in which the secret exists. Context of use
                                      determines the default value if left out (e.g., "default").
                                    type: string
                                required:
                                - name
                                type: object
                              trustedCA:
                                description: |-
                                  TrustedCA is the file name or k8s secret item name for the trusted CA.
                                  If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                  exist.
                                type: string
                            required:
                            - secret
                            type: object
                        type: object
                      type: array
                  type: object
                type: array
              ingressDeny:
                description: |-
                  IngressDeny is a list of IngressDenyRule which are enforced at ingress.
                  Any rule inserted here will be denied regardless of the allowed ingress
                  rules in the 'ingress' field.
                  If omitted or empty, this rule does not apply at ingress.
                items:
                  description: |-
                    IngressDenyRule contains all rule types which can be applied at ingress,
                    i.e. network traffic that originates outside of the endpoint and
                    is entering the endpoint selected by the endpointSelector.

                      - All members of this structure are optional. If omitted or empty, the
                        member will have no effect on the rule.

                      - If multiple members are set, all of them need to match in order for
                        the rule to take effect. The exception to this rule is FromRequires field;
                        the effects of any Requires field in any rule will apply to all other
                        rules as well.

                      - FromEndpoints, FromCIDR, FromCIDRSet, FromGroups and FromEntities are mutually
                        exclusive. Only one of these members may be present within an individual
                        rule.
                  properties:
                    fromCIDR:
                      description: |-
                        FromCIDR is a list of IP blocks which the endpoint subject to the
                        rule is allowed to receive connections from. Only connections which
                        do *not* originate from the cluster or from the local host are subject
                        to CIDR rules. In order to allow in-cluster connectivity, use the
                        FromEndpoints field.  This will match on the source IP address of
                        incoming connections. Adding  a prefix into FromCIDR or into
                        FromCIDRSet with no ExcludeCIDRs is  equivalent.  Overlaps are
                        allowed between FromCIDR and FromCIDRSet.

                        Example:
                        Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                        connections from 10.3.9.1
                      items:
                        description: |-
                          CIDR specifies a block of IP addresses.
                          Example: 192.0.2.1/32
                        format: cidr
                        type: string
                      type: array
                    fromCIDRSet:
                      description: |-
                        FromCIDRSet is a list of IP blocks which the endpoint subject to the
                        rule is allowed to receive connections from in addition to FromEndpoints,
                        along with a list of subnets contained within their corresponding IP block
                        from which traffic should not be allowed.
                        This will match on the source IP address of incoming connections. Adding
                        a prefix into FromCIDR or into FromCIDRSet with no ExcludeCIDRs is
                        equivalent. Overlaps are allowed between FromCIDR and FromCIDRSet.

                        Example:
                        Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                        connections from 10.0.0.0/8 except from IPs in subnet 10.96.0.0/12.
                      items:
                        description: |-
                          CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                          communication  is allowed, along with an optional list of subnets within that
                          CIDR prefix to/from which outside communication is not allowed.
                        oneOf:
                        - properties:
                            cidr: {}
                          required:
                          - cidr
                        - properties:
                            cidrGroupRef: {}
                          required:
                          - cidrGroupRef
                        - properties:
                            cidrGroupSelector: {}
                          required:
                          - cidrGroupSelector
                        properties:
                          cidr:
                            description: CIDR is a CIDR prefix / IP Block.
                            format: cidr
                            type: string
                          cidrGroupRef:
                            description: |-
                              CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                              A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                              the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                              connections from.
                            maxLength: 253
                            pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                            type: string
                          cidrGroupSelector:
                            description: |-
                              CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                              rather than by name.
                            properties:
                              matchExpressions:
                                description: matchExpressions is a list of label
                                  selector requirements. The requirements are ANDed.
                                items:
                                  description: |-
                                    A label selector requirement is a selector that contains values, a key, and an operator that
                                    relates the key and values.
                                  properties:
                                    key:
                                      description: key is the label key that the
                                        selector applies to.
                                      type: string
                                    operator:
                                      description: |-
                                        operator represents a key's relationship to a set of values.
                                        Valid operators are In, NotIn, Exists and DoesNotExist.
                                      enum:
                                      - In
                                      - NotIn
                                      - Exists
                                      - DoesNotExist
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
                                  description: MatchLabelsValue represents the value
                                    from the MatchLabels {key,value} pair.
                                  maxLength: 63
                                  pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                  type: string
                                description: |-
                                  matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                  map is equivalent to an element of matchExpressions, whose key field is "key", the
                                  operator is "In", and the values array contains only "value". The requirements are ANDed.
                                type: object
                            type: object
                            x-kubernetes-map-type: atomic
                          except:
                            description: |-
                              ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                              is not allowed to initiate connections to. These CIDR prefixes should be
                              contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                              supported yet.
                              These exceptions are only applied to the Cidr in this CIDRRule, and do not
                              apply to any other CIDR prefixes in any other CIDRRules.
                            items:
                              description: |-
                                CIDR specifies a block of IP addresses.
                                Example: 192.0.2.1/32
                              format: cidr
                              type: string
                            type: array
                        type: object
                      type: array
                    fromEndpoints:
                      description: |-
                        FromEndpoints is a list of endpoints identified by an
                        EndpointSelector which are allowed to communicate with the endpoint
                        subject to the rule.

                        Example:
                        Any endpoint with the label "role=backend" can be consumed by any
                        endpoint carrying the label "role=frontend".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    fromEntities:
                      description: |-
                        FromEntities is a list of special entities which the endpoint subject
                        to the rule is allowed to receive connections from. Supported entities are
                        `world`, `cluster` and `host`
                      items:
                        description: |-
                          Entity specifies the class of receiver/sender endpoints that do not have
                          individual identities.  Entities are used to describe "outside of cluster",
                          "host", etc.
                        enum:
                        - all
                        - world
                        - cluster
                        - host
                        - init
                        - ingress
                        - unmanaged
                        - remote-node
                        - health
                        - none
                        - kube-apiserver
                        type: string
                      type: array
                    fromGroups:
                      description: |-
                        FromGroups is a directive that allows the integration with multiple outside
                        providers. Currently, only AWS is supported, and the rule can select by
                        multiple sub directives:

                        Example:
                        FromGroups:
                        - aws:
                            securityGroupsIds:
                            - 'sg-XXXXXXXXXXXXX'
                      items:
                        description: |-
                          Groups structure to store all kinds of new integrations that needs a new
                          derivative policy.
                        properties:
                          aws:
                            description: AWSGroup is an structure that can be used
                              to whitelisting information from AWS integration
                            properties:
                              labels:
                                additionalProperties:
                                  type: string
                                type: object
                              region:
                                type: string
                              securityGroupsIds:
                                items:
                                  type: string
                                type: array
                              securityGroupsNames:
                                items:
                                  type: string
                                type: array
                            type: object
                        type: object
                      type: array
                    fromNodes:
                      description: |-
                        FromNodes is a list of nodes identified by an
                        EndpointSelector which are allowed to communicate with the endpoint
                        subject to the rule.
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    fromRequires:
                      description: |-
                        FromRequires is a list of additional constraints which must be met
                        in order for the selected endpoints to be reachable. These
                        additional constraints do no by itself grant access privileges and
                        must always be accompanied with at least one matching FromEndpoints.

                        Example:
                        Any Endpoint with the label "team=A" requires consuming endpoint
                        to also carry the label "team=A".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    icmps:
                      description: |-
                        ICMPs is a list of ICMP rule identified by type number
                        which the endpoint subject to the rule is not allowed to
                        receive connections on.

                        Example:
                        Any endpoint with the label "app=httpd" can not accept incoming
                        type 8 ICMP connections.
                      items:
                        description: ICMPRule is a list of ICMP fields.
                        properties:
                          fields:
                            description: Fields is a list of ICMP fields.
                            items:
                              description: ICMPField is a ICMP field.
                              properties:
                                family:
                                  default: IPv4
                                  description: |-
                                    Family is a IP address version.
                                    Currently, we support `IPv4` and `IPv6`.
                                    `IPv4` is set as default.
                                  enum:
                                  - IPv4
                                  - IPv6
                                  type: string
                                type:
                                  anyOf:
                                  - type: integer
                                  - type: string
                                  description: "Type is a ICMP-type.\nIt should
                                    be an 8bit code (0-255), or it's CamelCase name
                                    (for example, \"EchoReply\").\nAllowed ICMP
                                    types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                    | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                    | RouterSelection | TimeExceeded | ParameterProblem
                                    |\n\t\t\t Timestamp | TimestampReply | Photuris
                                    | ExtendedEcho Request | ExtendedEcho Reply\n
                                    \   Ipv6: DestinationUnreachable | PacketTooBig
                                    | TimeExceeded | ParameterProblem |\n\t\t\t
                                    EchoRequest | EchoReply | MulticastListenerQuery|
                                    MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                    | RouterSolicitation | RouterAdvertisement |
                                    NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                    | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                    |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                    | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                    HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                    | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                    | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                    |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                  pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                    Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                  x-kubernetes-int-or-string: true
                              required:
                              - type
                              type: object
                            maxItems: 40
                            type: array
                        type: object
                      type: array
                    toPorts:
                      description: |-
                        ToPorts is a list of destination ports identified by port number and
                        protocol which the endpoint subject to the rule is not allowed to
                        receive connections on.

                        Example:
                        Any endpoint with the label "app=httpd" can not accept incoming
                        connections on port 80/tcp.
                      items:
                        description: |-
                          PortDenyRule is a list of ports/protocol that should be used for deny
                          policies. This structure lacks the L7Rules since it's not supported in deny
                          policies.
                        properties:
                          ports:
                            description: Ports is a list of L4 port/protocol
                            items:
                              description: PortProtocol specifies an L4 port with
                                an optional transport protocol
                              properties:
                                endPort:
                                  description: EndPort can only be an L4 port number.
                                  format: int32
                                  maximum: 65535
                                  minimum: 0
                                  type: integer
                                port:
                                  description: |-
                                    Port can be an L4 port number, or a name in the form of "http"
                                    or "http-8080".
                                  pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                  type: string
                                protocol:
                                  description: |-
                                    Protocol is the L4 protocol. If omitted or empty, any protocol
                                    matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                    Matching on ICMP is not supported.

                                    Named port specified for a container may narrow this down, but may not
                                    contradict this.
                                  enum:
                                  - TCP
                                  - UDP
                                  - SCTP
                                  - ANY
                                  type: string
                              required:
                              - port
                              type: object
                            type: array
                        type: object
                      type: array
                  type: object
                type: array
              labels:
                description: |-
                  Labels is a list of optional strings which can be used to
                  re-identify the rule or to store metadata. It is possible to lookup
                  or delete strings based on labels. Labels are not required to be
                  unique, multiple rules can have overlapping or identical labels.
                items:
                  description: Label is the Cilium's representation of a container
                    label.
                  properties:
                    key:
                      type: string
                    source:
                      description: 'Source can be one of the above values (e.g.:
                        LabelSourceContainer).'
                      type: string
                    value:
                      type: string
                  required:
                  - key
                  type: object
                type: array
              nodeSelector:
                description: |-
                  NodeSelector selects all nodes which should be subject to this rule.
                  EndpointSelector and NodeSelector cannot be both empty and are mutually
                  exclusive. Can only be used in CiliumClusterwideNetworkPolicies.
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
                          enum:
                          - In
                          - NotIn
                          - Exists
                          - DoesNotExist
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
                      description: MatchLabelsValue represents the value from the
                        MatchLabels {key,value} pair.
                      maxLength: 63
                      pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                      type: string
                    description: |-
                      matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                      map is equivalent to an element of matchExpressions, whose key field is "key", the
                      operator is "In", and the values array contains only "value". The requirements are ANDed.
                    type: object
                type: object
                x-kubernetes-map-type: atomic
            type: object
          specs:
            description: Specs is a list of desired Cilium specific rule specification.
            items:
              anyOf:
              - properties:
                  ingress: {}
                required:
                - ingress
              - properties:
                  ingressDeny: {}
                required:
                - ingressDeny
              - properties:
                  egress: {}
                required:
                - egress
              - properties:
                  egressDeny: {}
                required:
                - egressDeny
              description: |-
                Rule is a policy rule which must be applied to all endpoints which match the
                labels contained in the endpointSelector

                Each rule is split into an ingress section which contains all rules
                applicable at ingress, and an egress section applicable at egress. For rule
                types such as `L4Rule` and `CIDR` which can be applied at both ingress and
                egress, both ingress and egress side have to either specifically allow the
                connection or one side has to be omitted.

                Either ingress, egress, or both can be provided. If both ingress and egress
                are omitted, the rule has no effect.
              oneOf:
              - properties:
                  endpointSelector: {}
                required:
                - endpointSelector
              - properties:
                  nodeSelector: {}
                required:
                - nodeSelector
              properties:
                description:
                  description: |-
                    Description is a free form string, it can be used by the creator of
                    the rule to store human readable explanation of the purpose of this
                    rule. Rules cannot be identified by comment.
                  type: string
                egress:
                  description: |-
                    Egress is a list of EgressRule which are enforced at egress.
                    If omitted or empty, this rule does not apply at egress.
                  items:
                    description: |-
                      EgressRule contains all rule types which can be applied at egress, i.e.
                      network traffic that originates inside the endpoint and exits the endpoint
                      selected by the endpointSelector.

                        - All members of this structure are optional. If omitted or empty, the
                          member will have no effect on the rule.

                        - If multiple members of the structure are specified, then all members
                          must match in order for the rule to take effect. The exception to this
                          rule is the ToRequires member; the effects of any Requires field in any
                          rule will apply to all other rules as well.

                        - ToEndpoints, ToCIDR, ToCIDRSet, ToEntities, ToServices and ToGroups are
                          mutually exclusive. Only one of these members may be present within an
                          individual rule.
                    properties:
                      authentication:
                        description: Authentication is the required authentication
                          type for the allowed traffic, if any.
                        properties:
                          mode:
                            description: Mode is the required authentication mode
                              for the allowed traffic, if any.
                            enum:
                            - disabled
                            - required
                            - test-always-fail
                            type: string
                        required:
                        - mode
                        type: object
                      icmps:
                        description: |-
                          ICMPs is a list of ICMP rule identified by type number
                          which the endpoint subject to the rule is allowed to connect to.

                          Example:
                          Any endpoint with the label "app=httpd" is allowed to initiate
                          type 8 ICMP connections.
                        items:
                          description: ICMPRule is a list of ICMP fields.
                          properties:
                            fields:
                              description: Fields is a list of ICMP fields.
                              items:
                                description: ICMPField is a ICMP field.
                                properties:
                                  family:
                                    default: IPv4
                                    description: |-
                                      Family is a IP address version.
                                      Currently, we support `IPv4` and `IPv6`.
                                      `IPv4` is set as default.
                                    enum:
                                    - IPv4
                                    - IPv6
                                    type: string
                                  type:
                                    anyOf:
                                    - type: integer
                                    - type: string
                                    description: "Type is a ICMP-type.\nIt should
                                      be an 8bit code (0-255), or it's CamelCase
                                      name (for example, \"EchoReply\").\nAllowed
                                      ICMP types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                      | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                      | RouterSelection | TimeExceeded | ParameterProblem
                                      |\n\t\t\t Timestamp | TimestampReply | Photuris
                                      | ExtendedEcho Request | ExtendedEcho Reply\n
                                      \   Ipv6: DestinationUnreachable | PacketTooBig
                                      | TimeExceeded | ParameterProblem |\n\t\t\t
                                      EchoRequest | EchoReply | MulticastListenerQuery|
                                      MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                      | RouterSolicitation | RouterAdvertisement
                                      | NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                      | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                      |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                      | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                      HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                      | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                      | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                      |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                    pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                      Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                    x-kubernetes-int-or-string: true
                                required:
                                - type
                                type: object
                              maxItems: 40
                              type: array
                          type: object
                        type: array
                      toCIDR:
                        description: |-
                          ToCIDR is a list of IP blocks which the endpoint subject to the rule
                          is allowed to initiate connections. Only connections destined for
                          outside of the cluster and not targeting the host will be subject
                          to CIDR rules.  This will match on the destination IP address of
                          outgoing connections. Adding a prefix into ToCIDR or into ToCIDRSet
                          with no ExcludeCIDRs is equivalent. Overlaps are allowed between
                          ToCIDR and ToCIDRSet.

                          Example:
                          Any endpoint with the label "app=database-proxy" is allowed to
                          initiate connections to 10.2.3.0/24
                        items:
                          description: |-
                            CIDR specifies a block of IP addresses.
                            Example: 192.0.2.1/32
                          format: cidr
                          type: string
                        type: array
                      toCIDRSet:
                        description: |-
                          ToCIDRSet is a list of IP blocks which the endpoint subject to the rule
                          is allowed to initiate connections to in addition to connections
                          which are allowed via ToEndpoints, along with a list of subnets contained
                          within their corresponding IP block to which traffic should not be
                          allowed. This will match on the destination IP address of outgoing
                          connections. Adding a prefix into ToCIDR or into ToCIDRSet with no
                          ExcludeCIDRs is equivalent. Overlaps are allowed between ToCIDR and
                          ToCIDRSet.

                          Example:
                          Any endpoint with the label "app=database-proxy" is allowed to
                          initiate connections to 10.2.3.0/24 except from IPs in subnet 10.2.3.0/28.
                        items:
                          description: |-
                            CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                            communication  is allowed, along with an optional list of subnets within that
                            CIDR prefix to/from which outside communication is not allowed.
                          oneOf:
                          - properties:
                              cidr: {}
                            required:
                            - cidr
                          - properties:
                              cidrGroupRef: {}
                            required:
                            - cidrGroupRef
                          - properties:
                              cidrGroupSelector: {}
                            required:
                            - cidrGroupSelector
                          properties:
                            cidr:
                              description: CIDR is a CIDR prefix / IP Block.
                              format: cidr
                              type: string
                            cidrGroupRef:
                              description: |-
                                CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                                A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                                the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                                connections from.
                              maxLength: 253
                              pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                              type: string
                            cidrGroupSelector:
                              description: |-
                                CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                                rather than by name.
                              properties:
                                matchExpressions:
                                  description: matchExpressions is a list of label
                                    selector requirements. The requirements are
                                    ANDed.
                                  items:
                                    description: |-
                                      A label selector requirement is a selector that contains values, a key, and an operator that
                                      relates the key and values.
                                    properties:
                                      key:
                                        description: key is the label key that the
                                          selector applies to.
                                        type: string
                                      operator:
                                        description: |-
                                          operator represents a key's relationship to a set of values.
                                          Valid operators are In, NotIn, Exists and DoesNotExist.
                                        enum:
                                        - In
                                        - NotIn
                                        - Exists
                                        - DoesNotExist
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
                                    description: MatchLabelsValue represents the
                                      value from the MatchLabels {key,value} pair.
                                    maxLength: 63
                                    pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                    type: string
                                  description: |-
                                    matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                    map is equivalent to an element of matchExpressions, whose key field is "key", the
                                    operator is "In", and the values array contains only "value". The requirements are ANDed.
                                  type: object
                              type: object
                              x-kubernetes-map-type: atomic
                            except:
                              description: |-
                                ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                                is not allowed to initiate connections to. These CIDR prefixes should be
                                contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                                supported yet.
                                These exceptions are only applied to the Cidr in this CIDRRule, and do not
                                apply to any other CIDR prefixes in any other CIDRRules.
                              items:
                                description: |-
                                  CIDR specifies a block of IP addresses.
                                  Example: 192.0.2.1/32
                                format: cidr
                                type: string
                              type: array
                          type: object
                        type: array
                      toEndpoints:
                        description: |-
                          ToEndpoints is a list of endpoints identified by an EndpointSelector to
                          which the endpoints subject to the rule are allowed to communicate.

                          Example:
                          Any endpoint with the label "role=frontend" can communicate with any
                          endpoint carrying the label "role=backend".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      toEntities:
                        description: |-
                          ToEntities is a list of special entities to which the endpoint subject
                          to the rule is allowed to initiate connections. Supported entities are
                          `world`, `cluster`,`host`,`remote-node`,`kube-apiserver`, `init`,
                          `health`,`unmanaged` and `all`.
                        items:
                          description: |-
                            Entity specifies the class of receiver/sender endpoints that do not have
                            individual identities.  Entities are used to describe "outside of cluster",
                            "host", etc.
                          enum:
                          - all
                          - world
                          - cluster
                          - host
                          - init
                          - ingress
                          - unmanaged
                          - remote-node
                          - health
                          - none
                          - kube-apiserver
                          type: string
                        type: array
                      toFQDNs:
                        description: |-
                          ToFQDN allows whitelisting DNS names in place of IPs. The IPs that result
                          from DNS resolution of `ToFQDN.MatchName`s are added to the same
                          EgressRule object as ToCIDRSet entries, and behave accordingly. Any L4 and
                          L7 rules within this EgressRule will also apply to these IPs.
                          The DNS -> IP mapping is re-resolved periodically from within the
                          cilium-agent, and the IPs in the DNS response are effected in the policy
                          for selected pods as-is (i.e. the list of IPs is not modified in any way).
                          Note: An explicit rule to allow for DNS traffic is needed for the pods, as
                          ToFQDN counts as an egress rule and will enforce egress policy when
                          PolicyEnforcment=default.
                          Note: If the resolved IPs are IPs within the kubernetes cluster, the
                          ToFQDN rule will not apply to that IP.
                          Note: ToFQDN cannot occur in the same policy as other To* rules.
                        items:
                          oneOf:
                          - properties:
                              matchName: {}
                            required:
                            - matchName
                          - properties:
                              matchPattern: {}
                            required:
                            - matchPattern
                          properties:
                            matchName:
                              description: |-
                                MatchName matches literal DNS names. A trailing "." is automatically added
                                when missing.
                              maxLength: 255
                              pattern: ^([-a-zA-Z0-9_]+[.]?)+$
                              type: string
                            matchPattern:
                              description: |-
                                MatchPattern allows using wildcards to match DNS names. All wildcards are
                                case insensitive. The wildcards are:
                                - "*" matches 0 or more DNS valid characters, and may occur anywhere in
                                the pattern. As a special case a "*" as the leftmost character, without a
                                following "." matches all subdomains as well as the name to the right.
                                A trailing "." is automatically added when missing.

                                Examples:
                                `*.cilium.io` matches subomains of cilium at that level
                                  www.cilium.io and blog.cilium.io match, cilium.io and google.com do not
                                `*cilium.io` matches cilium.io and all subdomains ends with "cilium.io"
                                  except those containing "." separator, subcilium.io and sub-cilium.io match,
                                  www.cilium.io and blog.cilium.io does not
                                sub*.cilium.io matches subdomains of cilium where the subdomain component
                                begins with "sub"
                                  sub.cilium.io and subdomain.cilium.io match, www.cilium.io,
                                  blog.cilium.io, cilium.io and google.com do not
                              maxLength: 255
                              pattern: ^([-a-zA-Z0-9_*]+[.]?)+$
                              type: string
                          type: object
                        type: array
                      toGroups:
                        description: |-
                          ToGroups is a directive that allows the integration with multiple outside
                          providers. Currently, only AWS is supported, and the rule can select by
                          multiple sub directives:

                          Example:
                          toGroups:
                          - aws:
                              securityGroupsIds:
                              - 'sg-XXXXXXXXXXXXX'
                        items:
                          description: |-
                            Groups structure to store all kinds of new integrations that needs a new
                            derivative policy.
                          properties:
                            aws:
                              description: AWSGroup is an structure that can be
                                used to whitelisting information from AWS integration
                              properties:
                                labels:
                                  additionalProperties:
                                    type: string
                                  type: object
                                region:
                                  type: string
                                securityGroupsIds:
                                  items:
                                    type: string
                                  type: array
                                securityGroupsNames:
                                  items:
                                    type: string
                                  type: array
                              type: object
                          type: object
                        type: array
                      toNodes:
                        description: |-
                          ToNodes is a list of nodes identified by an
                          EndpointSelector to which endpoints subject to the rule is allowed to communicate.
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      toPorts:
                        description: |-
                          ToPorts is a list of destination ports identified by port number and
                          protocol which the endpoint subject to the rule is allowed to
                          connect to.

                          Example:
                          Any endpoint with the label "role=frontend" is allowed to initiate
                          connections to destination port 8080/tcp
                        items:
                          description: |-
                            PortRule is a list of ports/protocol combinations with optional Layer 7
                            rules which must be met.
                          properties:
                            listener:
                              description: |-
                                listener specifies the name of a custom Envoy listener to which this traffic should be
                                redirected to.
                              properties:
                                envoyConfig:
                                  description: |-
                                    EnvoyConfig is a reference to the CEC or CCEC resource in which
                                    the listener is defined.
                                  properties:
                                    kind:
                                      description: |-
                                        Kind is the resource type being referred to. Defaults to CiliumEnvoyConfig or
                                        CiliumClusterwideEnvoyConfig for CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy,
                                        respectively. The only case this is currently explicitly needed is when referring to a
                                        CiliumClusterwideEnvoyConfig from CiliumNetworkPolicy, as using a namespaced listener
                                        from a cluster scoped policy is not allowed.
                                      enum:
                                      - CiliumEnvoyConfig
                                      - CiliumClusterwideEnvoyConfig
                                      type: string
                                    name:
                                      description: |-
                                        Name is the resource name of the CiliumEnvoyConfig or CiliumClusterwideEnvoyConfig where
                                        the listener is defined in.
                                      minLength: 1
                                      type: string
                                  required:
                                  - name
                                  type: object
                                name:
                                  description: Name is the name of the listener.
                                  minLength: 1
                                  type: string
                                priority:
                                  description: |-
                                    Priority for this Listener that is used when multiple rules would apply different
                                    listeners to a policy map entry. Behavior of this is implementation dependent.
                                  maximum: 100
                                  minimum: 1
                                  type: integer
                              required:
                              - envoyConfig
                              - name
                              type: object
                            originatingTLS:
                              description: |-
                                OriginatingTLS is the TLS context for the connections originated by
                                the L7 proxy.  For egress policy this specifies the client-side TLS
                                parameters for the upstream connection originating from the L7 proxy
                                to the remote destination. For ingress policy this specifies the
                                client-side TLS parameters for the connection from the L7 proxy to
                                the local endpoint.
                              properties:
                                certificate:
                                  description: |-
                                    Certificate is the file name or k8s secret item name for the certificate
                                    chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                    item must exist.
                                  type: string
                                privateKey:
                                  description: |-
                                    PrivateKey is the file name or k8s secret item name for the private key
                                    matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                    exists. If given, the item must exist.
                                  type: string
                                secret:
                                  description: |-
                                    Secret is the secret that contains the certificates and private key for
                                    the TLS context.
                                    By default, Cilium will search in this secret for the following items:
                                      - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                      - 'tls.crt' - Which represents the public key certificate.
                                      - 'tls.key' - Which represents the private key matching the public key
                                                    certificate.
                                  properties:
                                    name:
                                      description: Name is the name of the secret.
                                      type: string
                                    namespace:
                                      description: |-
                                        Namespace is the namespace in which the secret exists. Context of use
                                        determines the default value if left out (e.g., "default").
                                      type: string
                                  required:
                                  - name
                                  type: object
                                trustedCA:
                                  description: |-
                                    TrustedCA is the file name or k8s secret item name for the trusted CA.
                                    If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                    exist.
                                  type: string
                              required:
                              - secret
                              type: object
                            ports:
                              description: Ports is a list of L4 port/protocol
                              items:
                                description: PortProtocol specifies an L4 port with
                                  an optional transport protocol
                                properties:
                                  endPort:
                                    description: EndPort can only be an L4 port
                                      number.
                                    format: int32
                                    maximum: 65535
                                    minimum: 0
                                    type: integer
                                  port:
                                    description: |-
                                      Port can be an L4 port number, or a name in the form of "http"
                                      or "http-8080".
                                    pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                    type: string
                                  protocol:
                                    description: |-
                                      Protocol is the L4 protocol. If omitted or empty, any protocol
                                      matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                      Matching on ICMP is not supported.

                                      Named port specified for a container may narrow this down, but may not
                                      contradict this.
                                    enum:
                                    - TCP
                                    - UDP
                                    - SCTP
                                    - ANY
                                    type: string
                                required:
                                - port
                                type: object
                              maxItems: 40
                              type: array
                            rules:
                              description: |-
                                Rules is a list of additional port level rules which must be met in
                                order for the PortRule to allow the traffic. If omitted or empty,
                                no layer 7 rules are enforced.
                              oneOf:
                              - properties:
                                  http: {}
                                required:
                                - http
                              - properties:
                                  kafka: {}
                                required:
                                - kafka
                              - properties:
                                  dns: {}
                                required:
                                - dns
                              - properties:
                                  l7proto: {}
                                required:
                                - l7proto
                              properties:
                                dns:
                                  description: DNS-specific rules.
                                  items:
                                    description: PortRuleDNS is a list of allowed
                                      DNS lookups.
                                    oneOf:
                                    - properties:
                                        matchName: {}
                                      required:
                                      - matchName
                                    - properties:
                                        matchPattern: {}
                                      required:
                                      - matchPattern
                                    properties:
                                      matchName:
                                        description: |-
                                          MatchName matches literal DNS names. A trailing "." is automatically added
                                          when missing.
                                        maxLength: 255
                                        pattern: ^([-a-zA-Z0-9_]+[.]?)+$
                                        type: string
                                      matchPattern:
                                        description: |-
                                          MatchPattern allows using wildcards to match DNS names. All wildcards are
                                          case insensitive. The wildcards are:
                                          - "*" matches 0 or more DNS valid characters, and may occur anywhere in
                                          the pattern. As a special case a "*" as the leftmost character, without a
                                          following "." matches all subdomains as well as the name to the right.
                                          A trailing "." is automatically added when missing.

                                          Examples:
                                          `*.cilium.io` matches subomains of cilium at that level
                                            www.cilium.io and blog.cilium.io match, cilium.io and google.com do not
                                          `*cilium.io` matches cilium.io and all subdomains ends with "cilium.io"
                                            except those containing "." separator, subcilium.io and sub-cilium.io match,
                                            www.cilium.io and blog.cilium.io does not
                                          sub*.cilium.io matches subdomains of cilium where the subdomain component
                                          begins with "sub"
                                            sub.cilium.io and subdomain.cilium.io match, www.cilium.io,
                                            blog.cilium.io, cilium.io and google.com do not
                                        maxLength: 255
                                        pattern: ^([-a-zA-Z0-9_*]+[.]?)+$
                                        type: string
                                    type: object
                                  type: array
                                http:
                                  description: HTTP specific rules.
                                  items:
                                    description: |-
                                      PortRuleHTTP is a list of HTTP protocol constraints. All fields are
                                      optional, if all fields are empty or missing, the rule does not have any
                                      effect.

                                      All fields of this type are extended POSIX regex as defined by IEEE Std
                                      1003.1, (i.e this follows the egrep/unix syntax, not the perl syntax)
                                      matched against the path of an incoming request. Currently it can contain
                                      characters disallowed from the conventional "path" part of a URL as defined
                                      by RFC 3986.
                                    properties:
                                      headerMatches:
                                        description: |-
                                          HeaderMatches is a list of HTTP headers which must be
                                          present and match against the given values. Mismatch field can be used
                                          to specify what to do when there is no match.
                                        items:
                                          description: |-
                                            HeaderMatch extends the HeaderValue for matching requirement of a
                                            named header field against an immediate string, a secret value, or
                                            a regex.  If none of the optional fields is present, then the
                                            header value is not matched, only presence of the header is enough.
                                          properties:
                                            mismatch:
                                              description: |-
                                                Mismatch identifies what to do in case there is no match. The default is
                                                to drop the request. Otherwise the overall rule is still considered as
                                                matching, but the mismatches are logged in the access log.
                                              enum:
                                              - LOG
                                              - ADD
                                              - DELETE
                                              - REPLACE
                                              type: string
                                            name:
                                              description: Name identifies the header.
                                              minLength: 1
                                              type: string
                                            secret:
                                              description: |-
                                                Secret refers to a secret that contains the value to be matched against.
                                                The secret must only contain one entry. If the referred secret does not
                                                exist, and there is no "Value" specified, the match will fail.
                                              properties:
                                                name:
                                                  description: Name is the name
                                                    of the secret.
                                                  type: string
                                                namespace:
                                                  description: |-
                                                    Namespace is the namespace in which the secret exists. Context of use
                                                    determines the default value if left out (e.g., "default").
                                                  type: string
                                              required:
                                              - name
                                              type: object
                                            value:
                                              description: |-
                                                Value matches the exact value of the header. Can be specified either
                                                alone or together with "Secret"; will be used as the header value if the
                                                secret can not be found in the latter case.
                                              type: string
                                          required:
                                          - name
                                          type: object
                                        type: array
                                      headers:
                                        description: |-
                                          Headers is a list of HTTP headers which must be present in the
                                          request. If omitted or empty, requests are allowed regardless of
                                          headers present.
                                        items:
                                          type: string
                                        type: array
                                      host:
                                        description: |-
                                          Host is an extended POSIX regex matched against the host header of a
                                          request. Examples:

                                          - foo.bar.com will match the host fooXbar.com or foo-bar.com
                                          - foo\.bar\.com will only match the host foo.bar.com

                                          If omitted or empty, the value of the host header is ignored.
                                        format: idn-hostname
                                        type: string
                                      method:
                                        description: |-
                                          Method is an extended POSIX regex matched against the method of a
                                          request, e.g. "GET", "POST", "PUT", "PATCH", "DELETE", ...

                                          If omitted or empty, all methods are allowed.
                                        type: string
                                      path:
                                        description: |-
                                          Path is an extended POSIX regex matched against the path of a
                                          request. Currently it can contain characters disallowed from the
                                          conventional "path" part of a URL as defined by RFC 3986.

                                          If omitted or empty, all paths are all allowed.
                                        type: string
                                    type: object
                                  type: array
                                kafka:
                                  description: Kafka-specific rules.
                                  items:
                                    description: |-
                                      PortRule is a list of Kafka protocol constraints. All fields are
                                      optional, if all fields are empty or missing, the rule will match all
                                      Kafka messages.
                                    properties:
                                      apiKey:
                                        description: |-
                                          APIKey is a case-insensitive string matched against the key of a
                                          request, e.g. "produce", "fetch", "createtopic", "deletetopic", et al
                                          Reference: https://kafka.apache.org/protocol#protocol_api_keys

                                          If omitted or empty, and if Role is not specified, then all keys are allowed.
                                        type: string
                                      apiVersion:
                                        description: |-
                                          APIVersion is the version matched against the api version of the
                                          Kafka message. If set, it has to be a string representing a positive
                                          integer.

                                          If omitted or empty, all versions are allowed.
                                        type: string
                                      clientID:
                                        description: |-
                                          ClientID is the client identifier as provided in the request.

                                          From Kafka protocol documentation:
                                          This is a user supplied identifier for the client application. The
                                          user can use any identifier they like and it will be used when
                                          logging errors, monitoring aggregates, etc. For example, one might
                                          want to monitor not just the requests per second overall, but the
                                          number coming from each client application (each of which could
                                          reside on multiple servers). This id acts as a logical grouping
                                          across all requests from a particular client.

                                          If omitted or empty, all client identifiers are allowed.
                                        type: string
                                      role:
                                        description: |-
                                          Role is a case-insensitive string and describes a group of API keys
                                          necessary to perform certain higher-level Kafka operations such as "produce"
                                          or "consume". A Role automatically expands into all APIKeys required
                                          to perform the specified higher-level operation.

                                          The following values are supported:
                                            - "produce": Allow producing to the topics specified in the rule
                                            - "consume": Allow consuming from the topics specified in the rule

                                          This field is incompatible with the APIKey field, i.e APIKey and Role
                                          cannot both be specified in the same rule.

                                          If omitted or empty, and if APIKey is not specified, then all keys are
                                          allowed.
                                        enum:
                                        - produce
                                        - consume
                                        type: string
                                      topic:
                                        description: |-
                                          Topic is the topic name contained in the message. If a Kafka request
                                          contains multiple topics, then all topics must be allowed or the
                                          message will be rejected.

                                          This constraint is ignored if the matched request message type
                                          doesn't contain any topic. Maximum size of Topic can be 249
                                          characters as per recent Kafka spec and allowed characters are
                                          a-z, A-Z, 0-9, -, . and _.

                                          Older Kafka versions had longer topic lengths of 255, but in Kafka 0.10
                                          version the length was changed from 255 to 249. For compatibility
                                          reasons we are using 255.

                                          If omitted or empty, all topics are allowed.
                                        maxLength: 255
                                        type: string
                                    type: object
                                  type: array
                                l7:
                                  description: Key-value pair rules.
                                  items:
                                    additionalProperties:
                                      type: string
                                    description: |-
                                      PortRuleL7 is a list of key-value pairs interpreted by a L7 protocol as
                                      protocol constraints. All fields are optional, if all fields are empty or
                                      missing, the rule does not have any effect.
                                    type: object
                                  type: array
                                l7proto:
                                  description: Name of the L7 protocol for which
                                    the Key-value pair rules apply.
                                  type: string
                              type: object
                            serverNames:
                              description: |-
                                ServerNames is a list of allowed TLS SNI values. If not empty, then
                                TLS must be present and one of the provided SNIs must be indicated in the
                                TLS handshake.
                              items:
                                type: string
                              type: array
                            terminatingTLS:
                              description: |-
                                TerminatingTLS is the TLS context for the connection terminated by
                                the L7 proxy.  For egress policy this specifies the server-side TLS
                                parameters to be applied on the connections originated from the local
                                endpoint and terminated by the L7 proxy. For ingress policy this specifies
                                the server-side TLS parameters to be applied on the connections
                                originated from a remote source and terminated by the L7 proxy.
                              properties:
                                certificate:
                                  description: |-
                                    Certificate is the file name or k8s secret item name for the certificate
                                    chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                    item must exist.
                                  type: string
                                privateKey:
                                  description: |-
                                    PrivateKey is the file name or k8s secret item name for the private key
                                    matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                    exists. If given, the item must exist.
                                  type: string
                                secret:
                                  description: |-
                                    Secret is the secret that contains the certificates and private key for
                                    the TLS context.
                                    By default, Cilium will search in this secret for the following items:
                                      - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                      - 'tls.crt' - Which represents the public key certificate.
                                      - 'tls.key' - Which represents the private key matching the public key
                                                    certificate.
                                  properties:
                                    name:
                                      description: Name is the name of the secret.
                                      type: string
                                    namespace:
                                      description: |-
                                        Namespace is the namespace in which the secret exists. Context of use
                                        determines the default value if left out (e.g., "default").
                                      type: string
                                  required:
                                  - name
                                  type: object
                                trustedCA:
                                  description: |-
                                    TrustedCA is the file name or k8s secret item name for the trusted CA.
                                    If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                    exist.
                                  type: string
                              required:
                              - secret
                              type: object
                          type: object
                        type: array
                      toRequires:
                        description: |-
                          ToRequires is a list of additional constraints which must be met
                          in order for the selected endpoints to be able to connect to other
                          endpoints. These additional constraints do no by itself grant access
                          privileges and must always be accompanied with at least one matching
                          ToEndpoints.

                          Example:
                          Any Endpoint with the label "team=A" requires any endpoint to which it
                          communicates to also carry the label "team=A".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      toServices:
                        description: |-
                          ToServices is a list of services to which the endpoint subject
                          to the rule is allowed to initiate connections.
                          Currently Cilium only supports toServices for K8s services.
                        items:
                          description: |-
                            Service selects policy targets that are bundled as part of a
                            logical load-balanced service.

                            Currently only Kubernetes-based Services are supported.
                          properties:
                            k8sService:
                              description: K8sService selects service by name and
                                namespace pair
                              properties:
                                namespace:
                                  type: string
                                serviceName:
                                  type: string
                              type: object
                            k8sServiceSelector:
                              description: K8sServiceSelector selects services by
                                k8s labels and namespace
                              properties:
                                namespace:
                                  type: string
                                selector:
                                  description: ServiceSelector is a label selector
                                    for k8s services
                                  properties:
                                    matchExpressions:
                                      description: matchExpressions is a list of
                                        label selector requirements. The requirements
                                        are ANDed.
                                      items:
                                        description: |-
                                          A label selector requirement is a selector that contains values, a key, and an operator that
                                          relates the key and values.
                                        properties:
                                          key:
                                            description: key is the label key that
                                              the selector applies to.
                                            type: string
                                          operator:
                                            description: |-
                                              operator represents a key's relationship to a set of values.
                                              Valid operators are In, NotIn, Exists and DoesNotExist.
                                            enum:
                                            - In
                                            - NotIn
                                            - Exists
                                            - DoesNotExist
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
                                        description: MatchLabelsValue represents
                                          the value from the MatchLabels {key,value}
                                          pair.
                                        maxLength: 63
                                        pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                        type: string
                                      description: |-
                                        matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                        map is equivalent to an element of matchExpressions, whose key field is "key", the
                                        operator is "In", and the values array contains only "value". The requirements are ANDed.
                                      type: object
                                  type: object
                                  x-kubernetes-map-type: atomic
                              required:
                              - selector
                              type: object
                          type: object
                        type: array
                    type: object
                  type: array
                egressDeny:
                  description: |-
                    EgressDeny is a list of EgressDenyRule which are enforced at egress.
                    Any rule inserted here will be denied regardless of the allowed egress
                    rules in the 'egress' field.
                    If omitted or empty, this rule does not apply at egress.
                  items:
                    description: |-
                      EgressDenyRule contains all rule types which can be applied at egress, i.e.
                      network traffic that originates inside the endpoint and exits the endpoint
                      selected by the endpointSelector.

                        - All members of this structure are optional. If omitted or empty, the
                          member will have no effect on the rule.

                        - If multiple members of the structure are specified, then all members
                          must match in order for the rule to take effect. The exception to this
                          rule is the ToRequires member; the effects of any Requires field in any
                          rule will apply to all other rules as well.

                        - ToEndpoints, ToCIDR, ToCIDRSet, ToEntities, ToServices and ToGroups are
                          mutually exclusive. Only one of these members may be present within an
                          individual rule.
                    properties:
                      icmps:
                        description: |-
                          ICMPs is a list of ICMP rule identified by type number
                          which the endpoint subject to the rule is not allowed to connect to.

                          Example:
                          Any endpoint with the label "app=httpd" is not allowed to initiate
                          type 8 ICMP connections.
                        items:
                          description: ICMPRule is a list of ICMP fields.
                          properties:
                            fields:
                              description: Fields is a list of ICMP fields.
                              items:
                                description: ICMPField is a ICMP field.
                                properties:
                                  family:
                                    default: IPv4
                                    description: |-
                                      Family is a IP address version.
                                      Currently, we support `IPv4` and `IPv6`.
                                      `IPv4` is set as default.
                                    enum:
                                    - IPv4
                                    - IPv6
                                    type: string
                                  type:
                                    anyOf:
                                    - type: integer
                                    - type: string
                                    description: "Type is a ICMP-type.\nIt should
                                      be an 8bit code (0-255), or it's CamelCase
                                      name (for example, \"EchoReply\").\nAllowed
                                      ICMP types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                      | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                      | RouterSelection | TimeExceeded | ParameterProblem
                                      |\n\t\t\t Timestamp | TimestampReply | Photuris
                                      | ExtendedEcho Request | ExtendedEcho Reply\n
                                      \   Ipv6: DestinationUnreachable | PacketTooBig
                                      | TimeExceeded | ParameterProblem |\n\t\t\t
                                      EchoRequest | EchoReply | MulticastListenerQuery|
                                      MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                      | RouterSolicitation | RouterAdvertisement
                                      | NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                      | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                      |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                      | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                      HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                      | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                      | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                      |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                    pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                      Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                    x-kubernetes-int-or-string: true
                                required:
                                - type
                                type: object
                              maxItems: 40
                              type: array
                          type: object
                        type: array
                      toCIDR:
                        description: |-
                          ToCIDR is a list of IP blocks which the endpoint subject to the rule
                          is allowed to initiate connections. Only connections destined for
                          outside of the cluster and not targeting the host will be subject
                          to CIDR rules.  This will match on the destination IP address of
                          outgoing connections. Adding a prefix into ToCIDR or into ToCIDRSet
                          with no ExcludeCIDRs is equivalent. Overlaps are allowed between
                          ToCIDR and ToCIDRSet.

                          Example:
                          Any endpoint with the label "app=database-proxy" is allowed to
                          initiate connections to 10.2.3.0/24
                        items:
                          description: |-
                            CIDR specifies a block of IP addresses.
                            Example: 192.0.2.1/32
                          format: cidr
                          type: string
                        type: array
                      toCIDRSet:
                        description: |-
                          ToCIDRSet is a list of IP blocks which the endpoint subject to the rule
                          is allowed to initiate connections to in addition to connections
                          which are allowed via ToEndpoints, along with a list of subnets contained
                          within their corresponding IP block to which traffic should not be
                          allowed. This will match on the destination IP address of outgoing
                          connections. Adding a prefix into ToCIDR or into ToCIDRSet with no
                          ExcludeCIDRs is equivalent. Overlaps are allowed between ToCIDR and
                          ToCIDRSet.

                          Example:
                          Any endpoint with the label "app=database-proxy" is allowed to
                          initiate connections to 10.2.3.0/24 except from IPs in subnet 10.2.3.0/28.
                        items:
                          description: |-
                            CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                            communication  is allowed, along with an optional list of subnets within that
                            CIDR prefix to/from which outside communication is not allowed.
                          oneOf:
                          - properties:
                              cidr: {}
                            required:
                            - cidr
                          - properties:
                              cidrGroupRef: {}
                            required:
                            - cidrGroupRef
                          - properties:
                              cidrGroupSelector: {}
                            required:
                            - cidrGroupSelector
                          properties:
                            cidr:
                              description: CIDR is a CIDR prefix / IP Block.
                              format: cidr
                              type: string
                            cidrGroupRef:
                              description: |-
                                CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                                A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                                the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                                connections from.
                              maxLength: 253
                              pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                              type: string
                            cidrGroupSelector:
                              description: |-
                                CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                                rather than by name.
                              properties:
                                matchExpressions:
                                  description: matchExpressions is a list of label
                                    selector requirements. The requirements are
                                    ANDed.
                                  items:
                                    description: |-
                                      A label selector requirement is a selector that contains values, a key, and an operator that
                                      relates the key and values.
                                    properties:
                                      key:
                                        description: key is the label key that the
                                          selector applies to.
                                        type: string
                                      operator:
                                        description: |-
                                          operator represents a key's relationship to a set of values.
                                          Valid operators are In, NotIn, Exists and DoesNotExist.
                                        enum:
                                        - In
                                        - NotIn
                                        - Exists
                                        - DoesNotExist
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
                                    description: MatchLabelsValue represents the
                                      value from the MatchLabels {key,value} pair.
                                    maxLength: 63
                                    pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                    type: string
                                  description: |-
                                    matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                    map is equivalent to an element of matchExpressions, whose key field is "key", the
                                    operator is "In", and the values array contains only "value". The requirements are ANDed.
                                  type: object
                              type: object
                              x-kubernetes-map-type: atomic
                            except:
                              description: |-
                                ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                                is not allowed to initiate connections to. These CIDR prefixes should be
                                contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                                supported yet.
                                These exceptions are only applied to the Cidr in this CIDRRule, and do not
                                apply to any other CIDR prefixes in any other CIDRRules.
                              items:
                                description: |-
                                  CIDR specifies a block of IP addresses.
                                  Example: 192.0.2.1/32
                                format: cidr
                                type: string
                              type: array
                          type: object
                        type: array
                      toEndpoints:
                        description: |-
                          ToEndpoints is a list of endpoints identified by an EndpointSelector to
                          which the endpoints subject to the rule are allowed to communicate.

                          Example:
                          Any endpoint with the label "role=frontend" can communicate with any
                          endpoint carrying the label "role=backend".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      toEntities:
                        description: |-
                          ToEntities is a list of special entities to which the endpoint subject
                          to the rule is allowed to initiate connections. Supported entities are
                          `world`, `cluster`,`host`,`remote-node`,`kube-apiserver`, `init`,
                          `health`,`unmanaged` and `all`.
                        items:
                          description: |-
                            Entity specifies the class of receiver/sender endpoints that do not have
                            individual identities.  Entities are used to describe "outside of cluster",
                            "host", etc.
                          enum:
                          - all
                          - world
                          - cluster
                          - host
                          - init
                          - ingress
                          - unmanaged
                          - remote-node
                          - health
                          - none
                          - kube-apiserver
                          type: string
                        type: array
                      toGroups:
                        description: |-
                          ToGroups is a directive that allows the integration with multiple outside
                          providers. Currently, only AWS is supported, and the rule can select by
                          multiple sub directives:

                          Example:
                          toGroups:
                          - aws:
                              securityGroupsIds:
                              - 'sg-XXXXXXXXXXXXX'
                        items:
                          description: |-
                            Groups structure to store all kinds of new integrations that needs a new
                            derivative policy.
                          properties:
                            aws:
                              description: AWSGroup is an structure that can be
                                used to whitelisting information from AWS integration
                              properties:
                                labels:
                                  additionalProperties:
                                    type: string
                                  type: object
                                region:
                                  type: string
                                securityGroupsIds:
                                  items:
                                    type: string
                                  type: array
                                securityGroupsNames:
                                  items:
                                    type: string
                                  type: array
                              type: object
                          type: object
                        type: array
                      toNodes:
                        description: |-
                          ToNodes is a list of nodes identified by an
                          EndpointSelector to which endpoints subject to the rule is allowed to communicate.
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      toPorts:
                        description: |-
                          ToPorts is a list of destination ports identified by port number and
                          protocol which the endpoint subject to the rule is not allowed to connect
                          to.

                          Example:
                          Any endpoint with the label "role=frontend" is not allowed to initiate
                          connections to destination port 8080/tcp
                        items:
                          description: |-
                            PortDenyRule is a list of ports/protocol that should be used for deny
                            policies. This structure lacks the L7Rules since it's not supported in deny
                            policies.
                          properties:
                            ports:
                              description: Ports is a list of L4 port/protocol
                              items:
                                description: PortProtocol specifies an L4 port with
                                  an optional transport protocol
                                properties:
                                  endPort:
                                    description: EndPort can only be an L4 port
                                      number.
                                    format: int32
                                    maximum: 65535
                                    minimum: 0
                                    type: integer
                                  port:
                                    description: |-
                                      Port can be an L4 port number, or a name in the form of "http"
                                      or "http-8080".
                                    pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                    type: string
                                  protocol:
                                    description: |-
                                      Protocol is the L4 protocol. If omitted or empty, any protocol
                                      matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                      Matching on ICMP is not supported.

                                      Named port specified for a container may narrow this down, but may not
                                      contradict this.
                                    enum:
                                    - TCP
                                    - UDP
                                    - SCTP
                                    - ANY
                                    type: string
                                required:
                                - port
                                type: object
                              type: array
                          type: object
                        type: array
                      toRequires:
                        description: |-
                          ToRequires is a list of additional constraints which must be met
                          in order for the selected endpoints to be able to connect to other
                          endpoints. These additional constraints do no by itself grant access
                          privileges and must always be accompanied with at least one matching
                          ToEndpoints.

                          Example:
                          Any Endpoint with the label "team=A" requires any endpoint to which it
                          communicates to also carry the label "team=A".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      toServices:
                        description: |-
                          ToServices is a list of services to which the endpoint subject
                          to the rule is allowed to initiate connections.
                          Currently Cilium only supports toServices for K8s services.
                        items:
                          description: |-
                            Service selects policy targets that are bundled as part of a
                            logical load-balanced service.

                            Currently only Kubernetes-based Services are supported.
                          properties:
                            k8sService:
                              description: K8sService selects service by name and
                                namespace pair
                              properties:
                                namespace:
                                  type: string
                                serviceName:
                                  type: string
                              type: object
                            k8sServiceSelector:
                              description: K8sServiceSelector selects services by
                                k8s labels and namespace
                              properties:
                                namespace:
                                  type: string
                                selector:
                                  description: ServiceSelector is a label selector
                                    for k8s services
                                  properties:
                                    matchExpressions:
                                      description: matchExpressions is a list of
                                        label selector requirements. The requirements
                                        are ANDed.
                                      items:
                                        description: |-
                                          A label selector requirement is a selector that contains values, a key, and an operator that
                                          relates the key and values.
                                        properties:
                                          key:
                                            description: key is the label key that
                                              the selector applies to.
                                            type: string
                                          operator:
                                            description: |-
                                              operator represents a key's relationship to a set of values.
                                              Valid operators are In, NotIn, Exists and DoesNotExist.
                                            enum:
                                            - In
                                            - NotIn
                                            - Exists
                                            - DoesNotExist
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
                                        description: MatchLabelsValue represents
                                          the value from the MatchLabels {key,value}
                                          pair.
                                        maxLength: 63
                                        pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                        type: string
                                      description: |-
                                        matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                        map is equivalent to an element of matchExpressions, whose key field is "key", the
                                        operator is "In", and the values array contains only "value". The requirements are ANDed.
                                      type: object
                                  type: object
                                  x-kubernetes-map-type: atomic
                              required:
                              - selector
                              type: object
                          type: object
                        type: array
                    type: object
                  type: array
                enableDefaultDeny:
                  description: |-
                    EnableDefaultDeny determines whether this policy configures the
                    subject endpoint(s) to have a default deny mode. If enabled,
                    this causes all traffic not explicitly allowed by a network policy
                    to be dropped.

                    If not specified, the default is true for each traffic direction
                    that has rules, and false otherwise. For example, if a policy
                    only has Ingress or IngressDeny rules, then the default for
                    ingress is true and egress is false.

                    If multiple policies apply to an endpoint, that endpoint's default deny
                    will be enabled if any policy requests it.

                    This is useful for creating broad-based network policies that will not
                    cause endpoints to enter default-deny mode.
                  properties:
                    egress:
                      description: |-
                        Whether or not the endpoint should have a default-deny rule applied
                        to egress traffic.
                      type: boolean
                    ingress:
                      description: |-
                        Whether or not the endpoint should have a default-deny rule applied
                        to ingress traffic.
                      type: boolean
                  type: object
                endpointSelector:
                  description: |-
                    EndpointSelector selects all endpoints which should be subject to
                    this rule. EndpointSelector and NodeSelector cannot be both empty and
                    are mutually exclusive.
                  properties:
                    matchExpressions:
                      description: matchExpressions is a list of label selector
                        requirements. The requirements are ANDed.
                      items:
                        description: |-
                          A label selector requirement is a selector that contains values, a key, and an operator that
                          relates the key and values.
                        properties:
                          key:
                            description: key is the label key that the selector
                              applies to.
                            type: string
                          operator:
                            description: |-
                              operator represents a key's relationship to a set of values.
                              Valid operators are In, NotIn, Exists and DoesNotExist.
                            enum:
                            - In
                            - NotIn
                            - Exists
                            - DoesNotExist
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
                        description: MatchLabelsValue represents the value from
                          the MatchLabels {key,value} pair.
                        maxLength: 63
                        pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                        type: string
                      description: |-
                        matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                        map is equivalent to an element of matchExpressions, whose key field is "key", the
                        operator is "In", and the values array contains only "value". The requirements are ANDed.
                      type: object
                  type: object
                  x-kubernetes-map-type: atomic
                ingress:
                  description: |-
                    Ingress is a list of IngressRule which are enforced at ingress.
                    If omitted or empty, this rule does not apply at ingress.
                  items:
                    description: |-
                      IngressRule contains all rule types which can be applied at ingress,
                      i.e. network traffic that originates outside of the endpoint and
                      is entering the endpoint selected by the endpointSelector.

                        - All members of this structure are optional. If omitted or empty, the
                          member will have no effect on the rule.

                        - If multiple members are set, all of them need to match in order for
                          the rule to take effect. The exception to this rule is FromRequires field;
                          the effects of any Requires field in any rule will apply to all other
                          rules as well.

                        - FromEndpoints, FromCIDR, FromCIDRSet and FromEntities are mutually
                          exclusive. Only one of these members may be present within an individual
                          rule.
                    properties:
                      authentication:
                        description: Authentication is the required authentication
                          type for the allowed traffic, if any.
                        properties:
                          mode:
                            description: Mode is the required authentication mode
                              for the allowed traffic, if any.
                            enum:
                            - disabled
                            - required
                            - test-always-fail
                            type: string
                        required:
                        - mode
                        type: object
                      fromCIDR:
                        description: |-
                          FromCIDR is a list of IP blocks which the endpoint subject to the
                          rule is allowed to receive connections from. Only connections which
                          do *not* originate from the cluster or from the local host are subject
                          to CIDR rules. In order to allow in-cluster connectivity, use the
                          FromEndpoints field.  This will match on the source IP address of
                          incoming connections. Adding  a prefix into FromCIDR or into
                          FromCIDRSet with no ExcludeCIDRs is  equivalent.  Overlaps are
                          allowed between FromCIDR and FromCIDRSet.

                          Example:
                          Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                          connections from 10.3.9.1
                        items:
                          description: |-
                            CIDR specifies a block of IP addresses.
                            Example: 192.0.2.1/32
                          format: cidr
                          type: string
                        type: array
                      fromCIDRSet:
                        description: |-
                          FromCIDRSet is a list of IP blocks which the endpoint subject to the
                          rule is allowed to receive connections from in addition to FromEndpoints,
                          along with a list of subnets contained within their corresponding IP block
                          from which traffic should not be allowed.
                          This will match on the source IP address of incoming connections. Adding
                          a prefix into FromCIDR or into FromCIDRSet with no ExcludeCIDRs is
                          equivalent. Overlaps are allowed between FromCIDR and FromCIDRSet.

                          Example:
                          Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                          connections from 10.0.0.0/8 except from IPs in subnet 10.96.0.0/12.
                        items:
                          description: |-
                            CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                            communication  is allowed, along with an optional list of subnets within that
                            CIDR prefix to/from which outside communication is not allowed.
                          oneOf:
                          - properties:
                              cidr: {}
                            required:
                            - cidr
                          - properties:
                              cidrGroupRef: {}
                            required:
                            - cidrGroupRef
                          - properties:
                              cidrGroupSelector: {}
                            required:
                            - cidrGroupSelector
                          properties:
                            cidr:
                              description: CIDR is a CIDR prefix / IP Block.
                              format: cidr
                              type: string
                            cidrGroupRef:
                              description: |-
                                CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                                A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                                the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                                connections from.
                              maxLength: 253
                              pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                              type: string
                            cidrGroupSelector:
                              description: |-
                                CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                                rather than by name.
                              properties:
                                matchExpressions:
                                  description: matchExpressions is a list of label
                                    selector requirements. The requirements are
                                    ANDed.
                                  items:
                                    description: |-
                                      A label selector requirement is a selector that contains values, a key, and an operator that
                                      relates the key and values.
                                    properties:
                                      key:
                                        description: key is the label key that the
                                          selector applies to.
                                        type: string
                                      operator:
                                        description: |-
                                          operator represents a key's relationship to a set of values.
                                          Valid operators are In, NotIn, Exists and DoesNotExist.
                                        enum:
                                        - In
                                        - NotIn
                                        - Exists
                                        - DoesNotExist
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
                                    description: MatchLabelsValue represents the
                                      value from the MatchLabels {key,value} pair.
                                    maxLength: 63
                                    pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                    type: string
                                  description: |-
                                    matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                    map is equivalent to an element of matchExpressions, whose key field is "key", the
                                    operator is "In", and the values array contains only "value". The requirements are ANDed.
                                  type: object
                              type: object
                              x-kubernetes-map-type: atomic
                            except:
                              description: |-
                                ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                                is not allowed to initiate connections to. These CIDR prefixes should be
                                contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                                supported yet.
                                These exceptions are only applied to the Cidr in this CIDRRule, and do not
                                apply to any other CIDR prefixes in any other CIDRRules.
                              items:
                                description: |-
                                  CIDR specifies a block of IP addresses.
                                  Example: 192.0.2.1/32
                                format: cidr
                                type: string
                              type: array
                          type: object
                        type: array
                      fromEndpoints:
                        description: |-
                          FromEndpoints is a list of endpoints identified by an
                          EndpointSelector which are allowed to communicate with the endpoint
                          subject to the rule.

                          Example:
                          Any endpoint with the label "role=backend" can be consumed by any
                          endpoint carrying the label "role=frontend".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      fromEntities:
                        description: |-
                          FromEntities is a list of special entities which the endpoint subject
                          to the rule is allowed to receive connections from. Supported entities are
                          `world`, `cluster` and `host`
                        items:
                          description: |-
                            Entity specifies the class of receiver/sender endpoints that do not have
                            individual identities.  Entities are used to describe "outside of cluster",
                            "host", etc.
                          enum:
                          - all
                          - world
                          - cluster
                          - host
                          - init
                          - ingress
                          - unmanaged
                          - remote-node
                          - health
                          - none
                          - kube-apiserver
                          type: string
                        type: array
                      fromGroups:
                        description: |-
                          FromGroups is a directive that allows the integration with multiple outside
                          providers. Currently, only AWS is supported, and the rule can select by
                          multiple sub directives:

                          Example:
                          FromGroups:
                          - aws:
                              securityGroupsIds:
                              - 'sg-XXXXXXXXXXXXX'
                        items:
                          description: |-
                            Groups structure to store all kinds of new integrations that needs a new
                            derivative policy.
                          properties:
                            aws:
                              description: AWSGroup is an structure that can be
                                used to whitelisting information from AWS integration
                              properties:
                                labels:
                                  additionalProperties:
                                    type: string
                                  type: object
                                region:
                                  type: string
                                securityGroupsIds:
                                  items:
                                    type: string
                                  type: array
                                securityGroupsNames:
                                  items:
                                    type: string
                                  type: array
                              type: object
                          type: object
                        type: array
                      fromNodes:
                        description: |-
                          FromNodes is a list of nodes identified by an
                          EndpointSelector which are allowed to communicate with the endpoint
                          subject to the rule.
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      fromRequires:
                        description: |-
                          FromRequires is a list of additional constraints which must be met
                          in order for the selected endpoints to be reachable. These
                          additional constraints do no by itself grant access privileges and
                          must always be accompanied with at least one matching FromEndpoints.

                          Example:
                          Any Endpoint with the label "team=A" requires consuming endpoint
                          to also carry the label "team=A".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      icmps:
                        description: |-
                          ICMPs is a list of ICMP rule identified by type number
                          which the endpoint subject to the rule is allowed to
                          receive connections on.

                          Example:
                          Any endpoint with the label "app=httpd" can only accept incoming
                          type 8 ICMP connections.
                        items:
                          description: ICMPRule is a list of ICMP fields.
                          properties:
                            fields:
                              description: Fields is a list of ICMP fields.
                              items:
                                description: ICMPField is a ICMP field.
                                properties:
                                  family:
                                    default: IPv4
                                    description: |-
                                      Family is a IP address version.
                                      Currently, we support `IPv4` and `IPv6`.
                                      `IPv4` is set as default.
                                    enum:
                                    - IPv4
                                    - IPv6
                                    type: string
                                  type:
                                    anyOf:
                                    - type: integer
                                    - type: string
                                    description: "Type is a ICMP-type.\nIt should
                                      be an 8bit code (0-255), or it's CamelCase
                                      name (for example, \"EchoReply\").\nAllowed
                                      ICMP types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                      | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                      | RouterSelection | TimeExceeded | ParameterProblem
                                      |\n\t\t\t Timestamp | TimestampReply | Photuris
                                      | ExtendedEcho Request | ExtendedEcho Reply\n
                                      \   Ipv6: DestinationUnreachable | PacketTooBig
                                      | TimeExceeded | ParameterProblem |\n\t\t\t
                                      EchoRequest | EchoReply | MulticastListenerQuery|
                                      MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                      | RouterSolicitation | RouterAdvertisement
                                      | NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                      | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                      |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                      | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                      HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                      | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                      | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                      |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                    pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                      Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                    x-kubernetes-int-or-string: true
                                required:
                                - type
                                type: object
                              maxItems: 40
                              type: array
                          type: object
                        type: array
                      toPorts:
                        description: |-
                          ToPorts is a list of destination ports identified by port number and
                          protocol which the endpoint subject to the rule is allowed to
                          receive connections on.

                          Example:
                          Any endpoint with the label "app=httpd" can only accept incoming
                          connections on port 80/tcp.
                        items:
                          description: |-
                            PortRule is a list of ports/protocol combinations with optional Layer 7
                            rules which must be met.
                          properties:
                            listener:
                              description: |-
                                listener specifies the name of a custom Envoy listener to which this traffic should be
                                redirected to.
                              properties:
                                envoyConfig:
                                  description: |-
                                    EnvoyConfig is a reference to the CEC or CCEC resource in which
                                    the listener is defined.
                                  properties:
                                    kind:
                                      description: |-
                                        Kind is the resource type being referred to. Defaults to CiliumEnvoyConfig or
                                        CiliumClusterwideEnvoyConfig for CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy,
                                        respectively. The only case this is currently explicitly needed is when referring to a
                                        CiliumClusterwideEnvoyConfig from CiliumNetworkPolicy, as using a namespaced listener
                                        from a cluster scoped policy is not allowed.
                                      enum:
                                      - CiliumEnvoyConfig
                                      - CiliumClusterwideEnvoyConfig
                                      type: string
                                    name:
                                      description: |-
                                        Name is the resource name of the CiliumEnvoyConfig or CiliumClusterwideEnvoyConfig where
                                        the listener is defined in.
                                      minLength: 1
                                      type: string
                                  required:
                                  - name
                                  type: object
                                name:
                                  description: Name is the name of the listener.
                                  minLength: 1
                                  type: string
                                priority:
                                  description: |-
                                    Priority for this Listener that is used when multiple rules would apply different
                                    listeners to a policy map entry. Behavior of this is implementation dependent.
                                  maximum: 100
                                  minimum: 1
                                  type: integer
                              required:
                              - envoyConfig
                              - name
                              type: object
                            originatingTLS:
                              description: |-
                                OriginatingTLS is the TLS context for the connections originated by
                                the L7 proxy.  For egress policy this specifies the client-side TLS
                                parameters for the upstream connection originating from the L7 proxy
                                to the remote destination. For ingress policy this specifies the
                                client-side TLS parameters for the connection from the L7 proxy to
                                the local endpoint.
                              properties:
                                certificate:
                                  description: |-
                                    Certificate is the file name or k8s secret item name for the certificate
                                    chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                    item must exist.
                                  type: string
                                privateKey:
                                  description: |-
                                    PrivateKey is the file name or k8s secret item name for the private key
                                    matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                    exists. If given, the item must exist.
                                  type: string
                                secret:
                                  description: |-
                                    Secret is the secret that contains the certificates and private key for
                                    the TLS context.
                                    By default, Cilium will search in this secret for the following items:
                                      - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                      - 'tls.crt' - Which represents the public key certificate.
                                      - 'tls.key' - Which represents the private key matching the public key
                                                    certificate.
                                  properties:
                                    name:
                                      description: Name is the name of the secret.
                                      type: string
                                    namespace:
                                      description: |-
                                        Namespace is the namespace in which the secret exists. Context of use
                                        determines the default value if left out (e.g., "default").
                                      type: string
                                  required:
                                  - name
                                  type: object
                                trustedCA:
                                  description: |-
                                    TrustedCA is the file name or k8s secret item name for the trusted CA.
                                    If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                    exist.
                                  type: string
                              required:
                              - secret
                              type: object
                            ports:
                              description: Ports is a list of L4 port/protocol
                              items:
                                description: PortProtocol specifies an L4 port with
                                  an optional transport protocol
                                properties:
                                  endPort:
                                    description: EndPort can only be an L4 port
                                      number.
                                    format: int32
                                    maximum: 65535
                                    minimum: 0
                                    type: integer
                                  port:
                                    description: |-
                                      Port can be an L4 port number, or a name in the form of "http"
                                      or "http-8080".
                                    pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                    type: string
                                  protocol:
                                    description: |-
                                      Protocol is the L4 protocol. If omitted or empty, any protocol
                                      matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                      Matching on ICMP is not supported.

                                      Named port specified for a container may narrow this down, but may not
                                      contradict this.
                                    enum:
                                    - TCP
                                    - UDP
                                    - SCTP
                                    - ANY
                                    type: string
                                required:
                                - port
                                type: object
                              maxItems: 40
                              type: array
                            rules:
                              description: |-
                                Rules is a list of additional port level rules which must be met in
                                order for the PortRule to allow the traffic. If omitted or empty,
                                no layer 7 rules are enforced.
                              oneOf:
                              - properties:
                                  http: {}
                                required:
                                - http
                              - properties:
                                  kafka: {}
                                required:
                                - kafka
                              - properties:
                                  dns: {}
                                required:
                                - dns
                              - properties:
                                  l7proto: {}
                                required:
                                - l7proto
                              properties:
                                dns:
                                  description: DNS-specific rules.
                                  items:
                                    description: PortRuleDNS is a list of allowed
                                      DNS lookups.
                                    oneOf:
                                    - properties:
                                        matchName: {}
                                      required:
                                      - matchName
                                    - properties:
                                        matchPattern: {}
                                      required:
                                      - matchPattern
                                    properties:
                                      matchName:
                                        description: |-
                                          MatchName matches literal DNS names. A trailing "." is automatically added
                                          when missing.
                                        maxLength: 255
                                        pattern: ^([-a-zA-Z0-9_]+[.]?)+$
                                        type: string
                                      matchPattern:
                                        description: |-
                                          MatchPattern allows using wildcards to match DNS names. All wildcards are
                                          case insensitive. The wildcards are:
                                          - "*" matches 0 or more DNS valid characters, and may occur anywhere in
                                          the pattern. As a special case a "*" as the leftmost character, without a
                                          following "." matches all subdomains as well as the name to the right.
                                          A trailing "." is automatically added when missing.

                                          Examples:
                                          `*.cilium.io` matches subomains of cilium at that level
                                            www.cilium.io and blog.cilium.io match, cilium.io and google.com do not
                                          `*cilium.io` matches cilium.io and all subdomains ends with "cilium.io"
                                            except those containing "." separator, subcilium.io and sub-cilium.io match,
                                            www.cilium.io and blog.cilium.io does not
                                          sub*.cilium.io matches subdomains of cilium where the subdomain component
                                          begins with "sub"
                                            sub.cilium.io and subdomain.cilium.io match, www.cilium.io,
                                            blog.cilium.io, cilium.io and google.com do not
                                        maxLength: 255
                                        pattern: ^([-a-zA-Z0-9_*]+[.]?)+$
                                        type: string
                                    type: object
                                  type: array
                                http:
                                  description: HTTP specific rules.
                                  items:
                                    description: |-
                                      PortRuleHTTP is a list of HTTP protocol constraints. All fields are
                                      optional, if all fields are empty or missing, the rule does not have any
                                      effect.

                                      All fields of this type are extended POSIX regex as defined by IEEE Std
                                      1003.1, (i.e this follows the egrep/unix syntax, not the perl syntax)
                                      matched against the path of an incoming request. Currently it can contain
                                      characters disallowed from the conventional "path" part of a URL as defined
                                      by RFC 3986.
                                    properties:
                                      headerMatches:
                                        description: |-
                                          HeaderMatches is a list of HTTP headers which must be
                                          present and match against the given values. Mismatch field can be used
                                          to specify what to do when there is no match.
                                        items:
                                          description: |-
                                            HeaderMatch extends the HeaderValue for matching requirement of a
                                            named header field against an immediate string, a secret value, or
                                            a regex.  If none of the optional fields is present, then the
                                            header value is not matched, only presence of the header is enough.
                                          properties:
                                            mismatch:
                                              description: |-
                                                Mismatch identifies what to do in case there is no match. The default is
                                                to drop the request. Otherwise the overall rule is still considered as
                                                matching, but the mismatches are logged in the access log.
                                              enum:
                                              - LOG
                                              - ADD
                                              - DELETE
                                              - REPLACE
                                              type: string
                                            name:
                                              description: Name identifies the header.
                                              minLength: 1
                                              type: string
                                            secret:
                                              description: |-
                                                Secret refers to a secret that contains the value to be matched against.
                                                The secret must only contain one entry. If the referred secret does not
                                                exist, and there is no "Value" specified, the match will fail.
                                              properties:
                                                name:
                                                  description: Name is the name
                                                    of the secret.
                                                  type: string
                                                namespace:
                                                  description: |-
                                                    Namespace is the namespace in which the secret exists. Context of use
                                                    determines the default value if left out (e.g., "default").
                                                  type: string
                                              required:
                                              - name
                                              type: object
                                            value:
                                              description: |-
                                                Value matches the exact value of the header. Can be specified either
                                                alone or together with "Secret"; will be used as the header value if the
                                                secret can not be found in the latter case.
                                              type: string
                                          required:
                                          - name
                                          type: object
                                        type: array
                                      headers:
                                        description: |-
                                          Headers is a list of HTTP headers which must be present in the
                                          request. If omitted or empty, requests are allowed regardless of
                                          headers present.
                                        items:
                                          type: string
                                        type: array
                                      host:
                                        description: |-
                                          Host is an extended POSIX regex matched against the host header of a
                                          request. Examples:

                                          - foo.bar.com will match the host fooXbar.com or foo-bar.com
                                          - foo\.bar\.com will only match the host foo.bar.com

                                          If omitted or empty, the value of the host header is ignored.
                                        format: idn-hostname
                                        type: string
                                      method:
                                        description: |-
                                          Method is an extended POSIX regex matched against the method of a
                                          request, e.g. "GET", "POST", "PUT", "PATCH", "DELETE", ...

                                          If omitted or empty, all methods are allowed.
                                        type: string
                                      path:
                                        description: |-
                                          Path is an extended POSIX regex matched against the path of a
                                          request. Currently it can contain characters disallowed from the
                                          conventional "path" part of a URL as defined by RFC 3986.

                                          If omitted or empty, all paths are all allowed.
                                        type: string
                                    type: object
                                  type: array
                                kafka:
                                  description: Kafka-specific rules.
                                  items:
                                    description: |-
                                      PortRule is a list of Kafka protocol constraints. All fields are
                                      optional, if all fields are empty or missing, the rule will match all
                                      Kafka messages.
                                    properties:
                                      apiKey:
                                        description: |-
                                          APIKey is a case-insensitive string matched against the key of a
                                          request, e.g. "produce", "fetch", "createtopic", "deletetopic", et al
                                          Reference: https://kafka.apache.org/protocol#protocol_api_keys

                                          If omitted or empty, and if Role is not specified, then all keys are allowed.
                                        type: string
                                      apiVersion:
                                        description: |-
                                          APIVersion is the version matched against the api version of the
                                          Kafka message. If set, it has to be a string representing a positive
                                          integer.

                                          If omitted or empty, all versions are allowed.
                                        type: string
                                      clientID:
                                        description: |-
                                          ClientID is the client identifier as provided in the request.

                                          From Kafka protocol documentation:
                                          This is a user supplied identifier for the client application. The
                                          user can use any identifier they like and it will be used when
                                          logging errors, monitoring aggregates, etc. For example, one might
                                          want to monitor not just the requests per second overall, but the
                                          number coming from each client application (each of which could
                                          reside on multiple servers). This id acts as a logical grouping
                                          across all requests from a particular client.

                                          If omitted or empty, all client identifiers are allowed.
                                        type: string
                                      role:
                                        description: |-
                                          Role is a case-insensitive string and describes a group of API keys
                                          necessary to perform certain higher-level Kafka operations such as "produce"
                                          or "consume". A Role automatically expands into all APIKeys required
                                          to perform the specified higher-level operation.

                                          The following values are supported:
                                            - "produce": Allow producing to the topics specified in the rule
                                            - "consume": Allow consuming from the topics specified in the rule

                                          This field is incompatible with the APIKey field, i.e APIKey and Role
                                          cannot both be specified in the same rule.

                                          If omitted or empty, and if APIKey is not specified, then all keys are
                                          allowed.
                                        enum:
                                        - produce
                                        - consume
                                        type: string
                                      topic:
                                        description: |-
                                          Topic is the topic name contained in the message. If a Kafka request
                                          contains multiple topics, then all topics must be allowed or the
                                          message will be rejected.

                                          This constraint is ignored if the matched request message type
                                          doesn't contain any topic. Maximum size of Topic can be 249
                                          characters as per recent Kafka spec and allowed characters are
                                          a-z, A-Z, 0-9, -, . and _.

                                          Older Kafka versions had longer topic lengths of 255, but in Kafka 0.10
                                          version the length was changed from 255 to 249. For compatibility
                                          reasons we are using 255.

                                          If omitted or empty, all topics are allowed.
                                        maxLength: 255
                                        type: string
                                    type: object
                                  type: array
                                l7:
                                  description: Key-value pair rules.
                                  items:
                                    additionalProperties:
                                      type: string
                                    description: |-
                                      PortRuleL7 is a list of key-value pairs interpreted by a L7 protocol as
                                      protocol constraints. All fields are optional, if all fields are empty or
                                      missing, the rule does not have any effect.
                                    type: object
                                  type: array
                                l7proto:
                                  description: Name of the L7 protocol for which
                                    the Key-value pair rules apply.
                                  type: string
                              type: object
                            serverNames:
                              description: |-
                                ServerNames is a list of allowed TLS SNI values. If not empty, then
                                TLS must be present and one of the provided SNIs must be indicated in the
                                TLS handshake.
                              items:
                                type: string
                              type: array
                            terminatingTLS:
                              description: |-
                                TerminatingTLS is the TLS context for the connection terminated by
                                the L7 proxy.  For egress policy this specifies the server-side TLS
                                parameters to be applied on the connections originated from the local
                                endpoint and terminated by the L7 proxy. For ingress policy this specifies
                                the server-side TLS parameters to be applied on the connections
                                originated from a remote source and terminated by the L7 proxy.
                              properties:
                                certificate:
                                  description: |-
                                    Certificate is the file name or k8s secret item name for the certificate
                                    chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                    item must exist.
                                  type: string
                                privateKey:
                                  description: |-
                                    PrivateKey is the file name or k8s secret item name for the private key
                                    matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                    exists. If given, the item must exist.
                                  type: string
                                secret:
                                  description: |-
                                    Secret is the secret that contains the certificates and private key for
                                    the TLS context.
                                    By default, Cilium will search in this secret for the following items:
                                      - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                      - 'tls.crt' - Which represents the public key certificate.
                                      - 'tls.key' - Which represents the private key matching the public key
                                                    certificate.
                                  properties:
                                    name:
                                      description: Name is the name of the secret.
                                      type: string
                                    namespace:
                                      description: |-
                                        Namespace is the namespace in which the secret exists. Context of use
                                        determines the default value if left out (e.g., "default").
                                      type: string
                                  required:
                                  - name
                                  type: object
                                trustedCA:
                                  description: |-
                                    TrustedCA is the file name or k8s secret item name for the trusted CA.
                                    If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                    exist.
                                  type: string
                              required:
                              - secret
                              type: object
                          type: object
                        type: array
                    type: object
                  type: array
                ingressDeny:
                  description: |-
                    IngressDeny is a list of IngressDenyRule which are enforced at ingress.
                    Any rule inserted here will be denied regardless of the allowed ingress
                    rules in the 'ingress' field.
                    If omitted or empty, this rule does not apply at ingress.
                  items:
                    description: |-
                      IngressDenyRule contains all rule types which can be applied at ingress,
                      i.e. network traffic that originates outside of the endpoint and
                      is entering the endpoint selected by the endpointSelector.

                        - All members of this structure are optional. If omitted or empty, the
                          member will have no effect on the rule.

                        - If multiple members are set, all of them need to match in order for
                          the rule to take effect. The exception to this rule is FromRequires field;
                          the effects of any Requires field in any rule will apply to all other
                          rules as well.

                        - FromEndpoints, FromCIDR, FromCIDRSet, FromGroups and FromEntities are mutually
                          exclusive. Only one of these members may be present within an individual
                          rule.
                    properties:
                      fromCIDR:
                        description: |-
                          FromCIDR is a list of IP blocks which the endpoint subject to the
                          rule is allowed to receive connections from. Only connections which
                          do *not* originate from the cluster or from the local host are subject
                          to CIDR rules. In order to allow in-cluster connectivity, use the
                          FromEndpoints field.  This will match on the source IP address of
                          incoming connections. Adding  a prefix into FromCIDR or into
                          FromCIDRSet with no ExcludeCIDRs is  equivalent.  Overlaps are
                          allowed between FromCIDR and FromCIDRSet.

                          Example:
                          Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                          connections from 10.3.9.1
                        items:
                          description: |-
                            CIDR specifies a block of IP addresses.
                            Example: 192.0.2.1/32
                          format: cidr
                          type: string
                        type: array
                      fromCIDRSet:
                        description: |-
                          FromCIDRSet is a list of IP blocks which the endpoint subject to the
                          rule is allowed to receive connections from in addition to FromEndpoints,
                          along with a list of subnets contained within their corresponding IP block
                          from which traffic should not be allowed.
                          This will match on the source IP address of incoming connections. Adding
                          a prefix into FromCIDR or into FromCIDRSet with no ExcludeCIDRs is
                          equivalent. Overlaps are allowed between FromCIDR and FromCIDRSet.

                          Example:
                          Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                          connections from 10.0.0.0/8 except from IPs in subnet 10.96.0.0/12.
                        items:
                          description: |-
                            CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                            communication  is allowed, along with an optional list of subnets within that
                            CIDR prefix to/from which outside communication is not allowed.
                          oneOf:
                          - properties:
                              cidr: {}
                            required:
                            - cidr
                          - properties:
                              cidrGroupRef: {}
                            required:
                            - cidrGroupRef
                          - properties:
                              cidrGroupSelector: {}
                            required:
                            - cidrGroupSelector
                          properties:
                            cidr:
                              description: CIDR is a CIDR prefix / IP Block.
                              format: cidr
                              type: string
                            cidrGroupRef:
                              description: |-
                                CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                                A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                                the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                                connections from.
                              maxLength: 253
                              pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                              type: string
                            cidrGroupSelector:
                              description: |-
                                CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                                rather than by name.
                              properties:
                                matchExpressions:
                                  description: matchExpressions is a list of label
                                    selector requirements. The requirements are
                                    ANDed.
                                  items:
                                    description: |-
                                      A label selector requirement is a selector that contains values, a key, and an operator that
                                      relates the key and values.
                                    properties:
                                      key:
                                        description: key is the label key that the
                                          selector applies to.
                                        type: string
                                      operator:
                                        description: |-
                                          operator represents a key's relationship to a set of values.
                                          Valid operators are In, NotIn, Exists and DoesNotExist.
                                        enum:
                                        - In
                                        - NotIn
                                        - Exists
                                        - DoesNotExist
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
                                    description: MatchLabelsValue represents the
                                      value from the MatchLabels {key,value} pair.
                                    maxLength: 63
                                    pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                    type: string
                                  description: |-
                                    matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                    map is equivalent to an element of matchExpressions, whose key field is "key", the
                                    operator is "In", and the values array contains only "value". The requirements are ANDed.
                                  type: object
                              type: object
                              x-kubernetes-map-type: atomic
                            except:
                              description: |-
                                ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                                is not allowed to initiate connections to. These CIDR prefixes should be
                                contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                                supported yet.
                                These exceptions are only applied to the Cidr in this CIDRRule, and do not
                                apply to any other CIDR prefixes in any other CIDRRules.
                              items:
                                description: |-
                                  CIDR specifies a block of IP addresses.
                                  Example: 192.0.2.1/32
                                format: cidr
                                type: string
                              type: array
                          type: object
                        type: array
                      fromEndpoints:
                        description: |-
                          FromEndpoints is a list of endpoints identified by an
                          EndpointSelector which are allowed to communicate with the endpoint
                          subject to the rule.

                          Example:
                          Any endpoint with the label "role=backend" can be consumed by any
                          endpoint carrying the label "role=frontend".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      fromEntities:
                        description: |-
                          FromEntities is a list of special entities which the endpoint subject
                          to the rule is allowed to receive connections from. Supported entities are
                          `world`, `cluster` and `host`
                        items:
                          description: |-
                            Entity specifies the class of receiver/sender endpoints that do not have
                            individual identities.  Entities are used to describe "outside of cluster",
                            "host", etc.
                          enum:
                          - all
                          - world
                          - cluster
                          - host
                          - init
                          - ingress
                          - unmanaged
                          - remote-node
                          - health
                          - none
                          - kube-apiserver
                          type: string
                        type: array
                      fromGroups:
                        description: |-
                          FromGroups is a directive that allows the integration with multiple outside
                          providers. Currently, only AWS is supported, and the rule can select by
                          multiple sub directives:

                          Example:
                          FromGroups:
                          - aws:
                              securityGroupsIds:
                              - 'sg-XXXXXXXXXXXXX'
                        items:
                          description: |-
                            Groups structure to store all kinds of new integrations that needs a new
                            derivative policy.
                          properties:
                            aws:
                              description: AWSGroup is an structure that can be
                                used to whitelisting information from AWS integration
                              properties:
                                labels:
                                  additionalProperties:
                                    type: string
                                  type: object
                                region:
                                  type: string
                                securityGroupsIds:
                                  items:
                                    type: string
                                  type: array
                                securityGroupsNames:
                                  items:
                                    type: string
                                  type: array
                              type: object
                          type: object
                        type: array
                      fromNodes:
                        description: |-
                          FromNodes is a list of nodes identified by an
                          EndpointSelector which are allowed to communicate with the endpoint
                          subject to the rule.
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      fromRequires:
                        description: |-
                          FromRequires is a list of additional constraints which must be met
                          in order for the selected endpoints to be reachable. These
                          additional constraints do no by itself grant access privileges and
                          must always be accompanied with at least one matching FromEndpoints.

                          Example:
                          Any Endpoint with the label "team=A" requires consuming endpoint
                          to also carry the label "team=A".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      icmps:
                        description: |-
                          ICMPs is a list of ICMP rule identified by type number
                          which the endpoint subject to the rule is not allowed to
                          receive connections on.

                          Example:
                          Any endpoint with the label "app=httpd" can not accept incoming
                          type 8 ICMP connections.
                        items:
                          description: ICMPRule is a list of ICMP fields.
                          properties:
                            fields:
                              description: Fields is a list of ICMP fields.
                              items:
                                description: ICMPField is a ICMP field.
                                properties:
                                  family:
                                    default: IPv4
                                    description: |-
                                      Family is a IP address version.
                                      Currently, we support `IPv4` and `IPv6`.
                                      `IPv4` is set as default.
                                    enum:
                                    - IPv4
                                    - IPv6
                                    type: string
                                  type:
                                    anyOf:
                                    - type: integer
                                    - type: string
                                    description: "Type is a ICMP-type.\nIt should
                                      be an 8bit code (0-255), or it's CamelCase
                                      name (for example, \"EchoReply\").\nAllowed
                                      ICMP types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                      | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                      | RouterSelection | TimeExceeded | ParameterProblem
                                      |\n\t\t\t Timestamp | TimestampReply | Photuris
                                      | ExtendedEcho Request | ExtendedEcho Reply\n
                                      \   Ipv6: DestinationUnreachable | PacketTooBig
                                      | TimeExceeded | ParameterProblem |\n\t\t\t
                                      EchoRequest | EchoReply | MulticastListenerQuery|
                                      MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                      | RouterSolicitation | RouterAdvertisement
                                      | NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                      | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                      |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                      | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                      HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                      | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                      | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                      |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                    pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                      Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                    x-kubernetes-int-or-string: true
                                required:
                                - type
                                type: object
                              maxItems: 40
                              type: array
                          type: object
                        type: array
                      toPorts:
                        description: |-
                          ToPorts is a list of destination ports identified by port number and
                          protocol which the endpoint subject to the rule is not allowed to
                          receive connections on.

                          Example:
                          Any endpoint with the label "app=httpd" can not accept incoming
                          connections on port 80/tcp.
                        items:
                          description: |-
                            PortDenyRule is a list of ports/protocol that should be used for deny
                            policies. This structure lacks the L7Rules since it's not supported in deny
                            policies.
                          properties:
                            ports:
                              description: Ports is a list of L4 port/protocol
                              items:
                                description: PortProtocol specifies an L4 port with
                                  an optional transport protocol
                                properties:
                                  endPort:
                                    description: EndPort can only be an L4 port
                                      number.
                                    format: int32
                                    maximum: 65535
                                    minimum: 0
                                    type: integer
                                  port:
                                    description: |-
                                      Port can be an L4 port number, or a name in the form of "http"
                                      or "http-8080".
                                    pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                    type: string
                                  protocol:
                                    description: |-
                                      Protocol is the L4 protocol. If omitted or empty, any protocol
                                      matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                      Matching on ICMP is not supported.

                                      Named port specified for a container may narrow this down, but may not
                                      contradict this.
                                    enum:
                                    - TCP
                                    - UDP
                                    - SCTP
                                    - ANY
                                    type: string
                                required:
                                - port
                                type: object
                              type: array
                          type: object
                        type: array
                    type: object
                  type: array
                labels:
                  description: |-
                    Labels is a list of optional strings which can be used to
                    re-identify the rule or to store metadata. It is possible to lookup
                    or delete strings based on labels. Labels are not required to be
                    unique, multiple rules can have overlapping or identical labels.
                  items:
                    description: Label is the Cilium's representation of a container
                      label.
                    properties:
                      key:
                        type: string
                      source:
                        description: 'Source can be one of the above values (e.g.:
                          LabelSourceContainer).'
                        type: string
                      value:
                        type: string
                    required:
                    - key
                    type: object
                  type: array
                nodeSelector:
                  description: |-
                    NodeSelector selects all nodes which should be subject to this rule.
                    EndpointSelector and NodeSelector cannot be both empty and are mutually
                    exclusive. Can only be used in CiliumClusterwideNetworkPolicies.
                  properties:
                    matchExpressions:
                      description: matchExpressions is a list of label selector
                        requirements. The requirements are ANDed.
                      items:
                        description: |-
                          A label selector requirement is a selector that contains values, a key, and an operator that
                          relates the key and values.
                        properties:
                          key:
                            description: key is the label key that the selector
                              applies to.
                            type: string
                          operator:
                            description: |-
                              operator represents a key's relationship to a set of values.
                              Valid operators are In, NotIn, Exists and DoesNotExist.
                            enum:
                            - In
                            - NotIn
                            - Exists
                            - DoesNotExist
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
                        description: MatchLabelsValue represents the value from
                          the MatchLabels {key,value} pair.
                        maxLength: 63
                        pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                        type: string
                      description: |-
                        matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                        map is equivalent to an element of matchExpressions, whose key field is "key", the
                        operator is "In", and the values array contains only "value". The requirements are ANDed.
                      type: object
                  type: object
                  x-kubernetes-map-type: atomic
              type: object
            type: array
          status:
            description: |-
              Status is the status of the Cilium policy rule.

              The reason this field exists in this structure is due a bug in the k8s
              code-generator that doesn't create a `UpdateStatus` method because the
              field does not exist in the structure.
            properties:
              conditions:
                items:
                  properties:
                    lastTransitionTime:
                      description: The last time the condition transitioned from
                        one status to another.
                      format: date-time
                      type: string
                    message:
                      description: A human readable message indicating details about
                        the transition.
                      type: string
                    reason:
                      description: The reason for the condition's last transition.
                      type: string
                    status:
                      description: The status of the condition, one of True, False,
                        or Unknown
                      type: string
                    type:
                      description: The type of the policy condition
                      type: string
                  required:
                  - status
                  - type
                  type: object
                type: array
                x-kubernetes-list-map-keys:
                - type
                x-kubernetes-list-type: map
              derivativePolicies:
                additionalProperties:
                  description: |-
                    CiliumNetworkPolicyNodeStatus is the status of a Cilium policy rule for a
                    specific node.
                  properties:
                    annotations:
                      additionalProperties:
                        type: string
                      description: |-
                        Annotations corresponds to the Annotations in the ObjectMeta of the CNP
                        that have been realized on the node for CNP. That is, if a CNP has been
                        imported and has been assigned annotation X=Y by the user,
                        Annotations in CiliumNetworkPolicyNodeStatus will be X=Y once the
                        CNP that was imported corresponding to Annotation X=Y has been realized on
                        the node.
                      type: object
                    enforcing:
                      description: |-
                        Enforcing is set to true once all endpoints present at the time the
                        policy has been imported are enforcing this policy.
                      type: boolean
                    error:
                      description: |-
                        Error describes any error that occurred when parsing or importing the
                        policy, or realizing the policy for the endpoints to which it applies
                        on the node.
                      type: string
                    lastUpdated:
                      description: LastUpdated contains the last time this status
                        was updated
                      format: date-time
                      type: string
                    localPolicyRevision:
                      description: |-
                        Revision is the policy revision of the repository which first implemented
                        this policy.
                      format: int64
                      type: integer
                    ok:
                      description: |-
                        OK is true when the policy has been parsed and imported successfully
                        into the in-memory policy repository on the node.
                      type: boolean
                  type: object
                description: |-
                  DerivativePolicies is the status of all policies derived from the Cilium
                  policy
                type: object
            type: object
        required:
        - metadata
        type: object
    served: true
    storage: true
    subresources:
      status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  labels:
    io.cilium.k8s.crd.schema.version: 1.30.8
  name: ciliumendpoints.cilium.io
spec:
  conversion:
    strategy: None
  group: cilium.io
  names:
    categories:
    - cilium
    kind: CiliumEndpoint
    listKind: CiliumEndpointList
    plural: ciliumendpoints
    shortNames:
    - cep
    - ciliumep
    singular: ciliumendpoint
  scope: Namespaced
  versions:
  - additionalPrinterColumns:
    - description: Security Identity
      jsonPath: .status.identity.id
      name: Security Identity
      type: integer
    - description: Ingress enforcement in the endpoint
      jsonPath: .status.policy.ingress.state
      name: Ingress Enforcement
      priority: 1
      type: string
    - description: Egress enforcement in the endpoint
      jsonPath: .status.policy.egress.state
      name: Egress Enforcement
      priority: 1
      type: string
    - description: Endpoint current state
      jsonPath: .status.state
      name: Endpoint State
      type: string
    - description: Endpoint IPv4 address
      jsonPath: .status.networking.addressing[0].ipv4
      name: IPv4
      type: string
    - description: Endpoint IPv6 address
      jsonPath: .status.networking.addressing[0].ipv6
      name: IPv6
      type: string
    name: v2
    schema:
      openAPIV3Schema:
        description: CiliumEndpoint is the status of a Cilium policy rule.
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
          status:
            description: EndpointStatus is the status of a Cilium endpoint.
            properties:
              controllers:
                description: Controllers is the list of failing controllers for
                  this endpoint.
                items:
                  description: ControllerStatus is the status of a failing controller.
                  properties:
                    configuration:
                      description: Configuration is the controller configuration
                      properties:
                        error-retry:
                          description: Retry on error
                          type: boolean
                        error-retry-base:
                          description: |-
                            Base error retry back-off time
                            Format: duration
                          format: int64
                          type: integer
                        interval:
                          description: |-
                            Regular synchronization interval
                            Format: duration
                          format: int64
                          type: integer
                      type: object
                    name:
                      description: Name is the name of the controller
                      type: string
                    status:
                      description: Status is the status of the controller
                      properties:
                        consecutive-failure-count:
                          format: int64
                          type: integer
                        failure-count:
                          format: int64
                          type: integer
                        last-failure-msg:
                          type: string
                        last-failure-timestamp:
                          type: string
                        last-success-timestamp:
                          type: string
                        success-count:
                          format: int64
                          type: integer
                      type: object
                    uuid:
                      description: UUID is the UUID of the controller
                      type: string
                  type: object
                type: array
              encryption:
                description: Encryption is the encryption configuration of the node
                properties:
                  key:
                    description: |-
                      Key is the index to the key to use for encryption or 0 if encryption is
                      disabled.
                    type: integer
                type: object
              external-identifiers:
                description: |-
                  ExternalIdentifiers is a set of identifiers to identify the endpoint
                  apart from the pod name. This includes container runtime IDs.
                properties:
                  cni-attachment-id:
                    description: ID assigned to this attachment by container runtime
                    type: string
                  container-id:
                    description: ID assigned by container runtime (deprecated, may
                      not be unique)
                    type: string
                  container-name:
                    description: Name assigned to container (deprecated, may not
                      be unique)
                    type: string
                  docker-endpoint-id:
                    description: Docker endpoint ID
                    type: string
                  docker-network-id:
                    description: Docker network ID
                    type: string
                  k8s-namespace:
                    description: K8s namespace for this endpoint (deprecated, may
                      not be unique)
                    type: string
                  k8s-pod-name:
                    description: K8s pod name for this endpoint (deprecated, may
                      not be unique)
                    type: string
                  pod-name:
                    description: K8s pod for this endpoint (deprecated, may not
                      be unique)
                    type: string
                type: object
              health:
                description: Health is the overall endpoint & subcomponent health.
                properties:
                  bpf:
                    description: bpf
                    type: string
                  connected:
                    description: Is this endpoint reachable
                    type: boolean
                  overallHealth:
                    description: overall health
                    type: string
                  policy:
                    description: policy
                    type: string
                type: object
              id:
                description: ID is the cilium-agent-local ID of the endpoint.
                format: int64
                type: integer
              identity:
                description: Identity is the security identity associated with the
                  endpoint
                properties:
                  id:
                    description: ID is the numeric identity of the endpoint
                    format: int64
                    type: integer
                  labels:
                    description: Labels is the list of labels associated with the
                      identity
                    items:
                      type: string
                    type: array
                type: object
              log:
                description: Log is the list of the last few warning and error log
                  entries
                items:
                  description: |-
                    EndpointStatusChange Indication of a change of status

                    swagger:model EndpointStatusChange
                  properties:
                    code:
                      description: |-
                        Code indicate type of status change
                        Enum: ["ok","failed"]
                      type: string
                    message:
                      description: Status message
                      type: string
                    state:
                      description: state
                      type: string
                    timestamp:
                      description: Timestamp when status change occurred
                      type: string
                  type: object
                type: array
              named-ports:
                description: |-
                  NamedPorts List of named Layer 4 port and protocol pairs which will be used in Network
                  Policy specs.

                  swagger:model NamedPorts
                items:
                  description: |-
                    Port Layer 4 port / protocol pair

                    swagger:model Port
                  properties:
                    name:
                      description: Optional layer 4 port name
                      type: string
                    port:
                      description: Layer 4 port number
                      type: integer
                    protocol:
                      description: |-
                        Layer 4 protocol
                        Enum: ["TCP","UDP","SCTP","ICMP","ICMPV6","ANY"]
                      type: string
                  type: object
                type: array
              networking:
                description: Networking is the networking properties of the endpoint.
                properties:
                  addressing:
                    description: IP4/6 addresses assigned to this Endpoint
                    items:
                      description: AddressPair is a pair of IPv4 and/or IPv6 address.
                      properties:
                        ipv4:
                          type: string
                        ipv6:
                          type: string
                      type: object
                    type: array
                  node:
                    description: |-
                      NodeIP is the IP of the node the endpoint is running on. The IP must
                      be reachable between nodes.
                    type: string
                required:
                - addressing
                type: object
              policy:
                description: |-
                  EndpointPolicy represents the endpoint's policy by listing all allowed
                  ingress and egress identities in combination with L4 port and protocol.
                properties:
                  egress:
                    description: EndpointPolicyDirection is the list of allowed
                      identities per direction.
                    properties:
                      adding:
                        description: Deprecated
                        items:
                          description: IdentityTuple specifies a peer by identity,
                            destination port and protocol.
                          properties:
                            dest-port:
                              type: integer
                            identity:
                              format: int64
                              type: integer
                            identity-labels:
                              additionalProperties:
                                type: string
                              type: object
                            protocol:
                              type: integer
                          type: object
                        type: array
                      allowed:
                        description: |-
                          AllowedIdentityList is a list of IdentityTuples that species peers that are
                          allowed.
                        items:
                          description: IdentityTuple specifies a peer by identity,
                            destination port and protocol.
                          properties:
                            dest-port:
                              type: integer
                            identity:
                              format: int64
                              type: integer
                            identity-labels:
                              additionalProperties:
                                type: string
                              type: object
                            protocol:
                              type: integer
                          type: object
                        type: array
                      denied:
                        description: |-
                          DenyIdentityList is a list of IdentityTuples that species peers that are
                          denied.
                        items:
                          description: IdentityTuple specifies a peer by identity,
                            destination port and protocol.
                          properties:
                            dest-port:
                              type: integer
                            identity:
                              format: int64
                              type: integer
                            identity-labels:
                              additionalProperties:
                                type: string
                              type: object
                            protocol:
                              type: integer
                          type: object
                        type: array
                      enforcing:
                        type: boolean
                      removing:
                        description: Deprecated
                        items:
                          description: IdentityTuple specifies a peer by identity,
                            destination port and protocol.
                          properties:
                            dest-port:
                              type: integer
                            identity:
                              format: int64
                              type: integer
                            identity-labels:
                              additionalProperties:
                                type: string
                              type: object
                            protocol:
                              type: integer
                          type: object
                        type: array
                      state:
                        description: 'EndpointPolicyState defines the state of the
                          Policy mode: "enforcing", "non-enforcing", "disabled"'
                        type: string
                    required:
                    - enforcing
                    type: object
                  ingress:
                    description: EndpointPolicyDirection is the list of allowed
                      identities per direction.
                    properties:
                      adding:
                        description: Deprecated
                        items:
                          description: IdentityTuple specifies a peer by identity,
                            destination port and protocol.
                          properties:
                            dest-port:
                              type: integer
                            identity:
                              format: int64
                              type: integer
                            identity-labels:
                              additionalProperties:
                                type: string
                              type: object
                            protocol:
                              type: integer
                          type: object
                        type: array
                      allowed:
                        description: |-
                          AllowedIdentityList is a list of IdentityTuples that species peers that are
                          allowed.
                        items:
                          description: IdentityTuple specifies a peer by identity,
                            destination port and protocol.
                          properties:
                            dest-port:
                              type: integer
                            identity:
                              format: int64
                              type: integer
                            identity-labels:
                              additionalProperties:
                                type: string
                              type: object
                            protocol:
                              type: integer
                          type: object
                        type: array
                      denied:
                        description: |-
                          DenyIdentityList is a list of IdentityTuples that species peers that are
                          denied.
                        items:
                          description: IdentityTuple specifies a peer by identity,
                            destination port and protocol.
                          properties:
                            dest-port:
                              type: integer
                            identity:
                              format: int64
                              type: integer
                            identity-labels:
                              additionalProperties:
                                type: string
                              type: object
                            protocol:
                              type: integer
                          type: object
                        type: array
                      enforcing:
                        type: boolean
                      removing:
                        description: Deprecated
                        items:
                          description: IdentityTuple specifies a peer by identity,
                            destination port and protocol.
                          properties:
                            dest-port:
                              type: integer
                            identity:
                              format: int64
                              type: integer
                            identity-labels:
                              additionalProperties:
                                type: string
                              type: object
                            protocol:
                              type: integer
                          type: object
                        type: array
                      state:
                        description: 'EndpointPolicyState defines the state of the
                          Policy mode: "enforcing", "non-enforcing", "disabled"'
                        type: string
                    required:
                    - enforcing
                    type: object
                type: object
              state:
                description: State is the state of the endpoint.
                enum:
                - creating
                - waiting-for-identity
                - not-ready
                - waiting-to-regenerate
                - regenerating
                - restoring
                - ready
                - disconnecting
                - disconnected
                - invalid
                type: string
            type: object
        required:
        - metadata
        type: object
    served: true
    storage: true
    subresources: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  labels:
    io.cilium.k8s.crd.schema.version: 1.30.8
  name: ciliumenvoyconfigs.cilium.io
spec:
  conversion:
    strategy: None
  group: cilium.io
  names:
    categories:
    - cilium
    kind: CiliumEnvoyConfig
    listKind: CiliumEnvoyConfigList
    plural: ciliumenvoyconfigs
    shortNames:
    - cec
    singular: ciliumenvoyconfig
  scope: Namespaced
  versions:
  - additionalPrinterColumns:
    - description: The age of the identity
      jsonPath: .metadata.creationTimestamp
      name: Age
      type: date
    name: v2
    schema:
      openAPIV3Schema:
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
              backendServices:
                description: |-
                  BackendServices specifies Kubernetes services whose backends
                  are automatically synced to Envoy using EDS.  Traffic for these
                  services is not forwarded to an Envoy listener. This allows an
                  Envoy listener load balance traffic to these backends while
                  normal Cilium service load balancing takes care of balancing
                  traffic for these services at the same time.
                items:
                  properties:
                    name:
                      description: |-
                        Name is the name of a destination Kubernetes service that identifies traffic
                        to be redirected.
                      type: string
                    namespace:
                      description: |-
                        Namespace is the Kubernetes service namespace.
                        In CiliumEnvoyConfig namespace defaults to the namespace of the CEC,
                        In CiliumClusterwideEnvoyConfig namespace defaults to "default".
                      type: string
                    number:
                      description: |-
                        Ports is a set of port numbers, which can be used for filtering in case of underlying
                        is exposing multiple port numbers.
                      items:
                        type: string
                      type: array
                  required:
                  - name
                  type: object
                type: array
              nodeSelector:
                description: |-
                  NodeSelector is a label selector that determines to which nodes
                  this configuration applies.
                  If nil, then this config applies to all nodes.
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
                          enum:
                          - In
                          - NotIn
                          - Exists
                          - DoesNotExist
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
                      description: MatchLabelsValue represents the value from the
                        MatchLabels {key,value} pair.
                      maxLength: 63
                      pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                      type: string
                    description: |-
                      matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                      map is equivalent to an element of matchExpressions, whose key field is "key", the
                      operator is "In", and the values array contains only "value". The requirements are ANDed.
                    type: object
                type: object
                x-kubernetes-map-type: atomic
              resources:
                description: |-
                  Envoy xDS resources, a list of the following Envoy resource types:
                  type.googleapis.com/envoy.config.listener.v3.Listener,
                  type.googleapis.com/envoy.config.route.v3.RouteConfiguration,
                  type.googleapis.com/envoy.config.cluster.v3.Cluster,
                  type.googleapis.com/envoy.config.endpoint.v3.ClusterLoadAssignment, and
                  type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.Secret.
                items:
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                type: array
              services:
                description: |-
                  Services specifies Kubernetes services for which traffic is
                  forwarded to an Envoy listener for L7 load balancing. Backends
                  of these services are automatically synced to Envoy usign EDS.
                items:
                  properties:
                    listener:
                      description: |-
                        Listener specifies the name of the Envoy listener the
                        service traffic is redirected to. The listener must be
                        specified in the Envoy 'resources' of the same
                        CiliumEnvoyConfig.

                        If omitted, the first listener specified in 'resources' is
                        used.
                      type: string
                    name:
                      description: |-
                        Name is the name of a destination Kubernetes service that identifies traffic
                        to be redirected.
                      type: string
                    namespace:
                      description: |-
                        Namespace is the Kubernetes service namespace.
                        In CiliumEnvoyConfig namespace this is overridden to the namespace of the CEC,
                        In CiliumClusterwideEnvoyConfig namespace defaults to "default".
                      type: string
                    ports:
                      description: |-
                        Ports is a set of service's frontend ports that should be redirected to the Envoy
                        listener. By default all frontend ports of the service are redirected.
                      items:
                        type: integer
                      type: array
                  required:
                  - name
                  type: object
                type: array
            required:
            - resources
            type: object
        required:
        - metadata
        type: object
    served: true
    storage: true
    subresources: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  labels:
    io.cilium.k8s.crd.schema.version: 1.30.8
  name: ciliumexternalworkloads.cilium.io
spec:
  conversion:
    strategy: None
  group: cilium.io
  names:
    categories:
    - cilium
    kind: CiliumExternalWorkload
    listKind: CiliumExternalWorkloadList
    plural: ciliumexternalworkloads
    shortNames:
    - cew
    singular: ciliumexternalworkload
  scope: Cluster
  versions:
  - additionalPrinterColumns:
    - jsonPath: .status.id
      name: Cilium ID
      type: integer
    - jsonPath: .status.ip
      name: IP
      type: string
    name: v2
    schema:
      openAPIV3Schema:
        description: |-
          CiliumExternalWorkload is a Kubernetes Custom Resource that
          contains a specification for an external workload that can join the
          cluster.  The name of the CRD is the FQDN of the external workload,
          and it needs to match the name in the workload registration. The
          labels on the CRD object are the labels that will be used to
          allocate a Cilium Identity for the external workload. If
          'io.kubernetes.pod.namespace' or 'io.kubernetes.pod.name' labels
          are not explicitly specified, they will be defaulted to 'default'
          and <workload name>, respectively. 'io.cilium.k8s.policy.cluster'
          will always be defined as the name of the current cluster, which
          defaults to "default".
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
            description: Spec is the desired configuration of the external Cilium
              workload.
            properties:
              ipv4-alloc-cidr:
                description: |-
                  IPv4AllocCIDR is the range of IPv4 addresses in the CIDR format that the external workload can
                  use to allocate IP addresses for the tunnel device and the health endpoint.
                pattern: ^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$
                type: string
              ipv6-alloc-cidr:
                description: |-
                  IPv6AllocCIDR is the range of IPv6 addresses in the CIDR format that the external workload can
                  use to allocate IP addresses for the tunnel device and the health endpoint.
                pattern: ^s*((([0-9A-Fa-f]{1,4}:){7}(:|([0-9A-Fa-f]{1,4})))|(([0-9A-Fa-f]{1,4}:){6}:([0-9A-Fa-f]{1,4})?)|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){0,1}):([0-9A-Fa-f]{1,4})?))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){0,2}):([0-9A-Fa-f]{1,4})?))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){0,3}):([0-9A-Fa-f]{1,4})?))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){0,4}):([0-9A-Fa-f]{1,4})?))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){0,5}):([0-9A-Fa-f]{1,4})?))|(:(:|((:[0-9A-Fa-f]{1,4}){1,7}))))(%.+)?s*/([0-9]|[1-9][0-9]|1[0-1][0-9]|12[0-8])$
                type: string
            type: object
          status:
            description: |-
              Status is the most recent status of the external Cilium workload.
              It is a read-only field.
            properties:
              id:
                description: ID is the numeric identity allocated for the external
                  workload.
                format: int64
                type: integer
              ip:
                description: IP is the IP address of the workload. Empty if the
                  workload has not registered.
                type: string
            type: object
        required:
        - metadata
        type: object
    served: true
    storage: true
    subresources:
      status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  labels:
    io.cilium.k8s.crd.schema.version: 1.30.8
  name: ciliumidentities.cilium.io
spec:
  conversion:
    strategy: None
  group: cilium.io
  names:
    categories:
    - cilium
    kind: CiliumIdentity
    listKind: CiliumIdentityList
    plural: ciliumidentities
    shortNames:
    - ciliumid
    singular: ciliumidentity
  scope: Cluster
  versions:
  - additionalPrinterColumns:
    - description: The namespace of the entity
      jsonPath: .metadata.labels.io\.kubernetes\.pod\.namespace
      name: Namespace
      type: string
    - description: The age of the identity
      jsonPath: .metadata.creationTimestamp
      name: Age
      type: date
    name: v2
    schema:
      openAPIV3Schema:
        description: "CiliumIdentity is a CRD that represents an identity managed
          by Cilium.\nIt is intended as a backing store for identity allocation,
          acting as the\nglobal coordination backend, and can be used in place of
          a KVStore (such as\netcd).\nThe name of the CRD is the numeric identity
          and the labels on the CRD object\nare the kubernetes sourced labels seen
          by cilium. This is currently the\nonly label source possible when running
          under kubernetes. Non-kubernetes\nlabels are filtered but all labels,
          from all sources, are places in the\nSecurityLabels field. These also
          include the source and are used to define\nthe identity.\nThe labels under
          metav1.ObjectMeta can be used when searching for\nCiliumIdentity instances
          that include particular labels. This can be done\nwith invocations such
          as:\n\n\tkubectl get ciliumid -l 'foo=bar'"
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
          security-labels:
            additionalProperties:
              type: string
            description: SecurityLabels is the source-of-truth set of labels for
              this identity.
            type: object
        required:
        - metadata
        - security-labels
        type: object
    served: true
    storage: true
    subresources:
      status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  labels:
    io.cilium.k8s.crd.schema.version: 1.30.8
  name: ciliuml2announcementpolicies.cilium.io
spec:
  conversion:
    strategy: None
  group: cilium.io
  names:
    categories:
    - cilium
    kind: CiliumL2AnnouncementPolicy
    listKind: CiliumL2AnnouncementPolicyList
    plural: ciliuml2announcementpolicies
    shortNames:
    - l2announcement
    singular: ciliuml2announcementpolicy
  scope: Cluster
  versions:
  - additionalPrinterColumns:
    - jsonPath: .metadata.creationTimestamp
      name: Age
      type: date
    name: v2alpha1
    schema:
      openAPIV3Schema:
        description: |-
          CiliumL2AnnouncementPolicy is a Kubernetes third-party resource which
          is used to defined which nodes should announce what services on the
          L2 network.
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
            description: Spec is a human readable description of a L2 announcement
              policy
            properties:
              externalIPs:
                description: If true, the external IPs of the services are announced
                type: boolean
              interfaces:
                description: |-
                  A list of regular expressions that express which network interface(s) should be used
                  to announce the services over. If nil, all network interfaces are used.
                items:
                  type: string
                type: array
              loadBalancerIPs:
                description: |-
                  If true, the loadbalancer IPs of the services are announced

                  If nil this policy applies to all services.
                type: boolean
              nodeSelector:
                description: |-
                  NodeSelector selects a group of nodes which will announce the IPs for
                  the services selected by the service selector.

                  If nil this policy applies to all nodes.
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
                          enum:
                          - In
                          - NotIn
                          - Exists
                          - DoesNotExist
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
                      description: MatchLabelsValue represents the value from the
                        MatchLabels {key,value} pair.
                      maxLength: 63
                      pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                      type: string
                    description: |-
                      matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                      map is equivalent to an element of matchExpressions, whose key field is "key", the
                      operator is "In", and the values array contains only "value". The requirements are ANDed.
                    type: object
                type: object
                x-kubernetes-map-type: atomic
              serviceSelector:
                description: |-
                  ServiceSelector selects a set of services which will be announced over L2 networks.
                  The loadBalancerClass for a service must be nil or specify a supported class, e.g.
                  "io.cilium/l2-announcer". Refer to the following document for additional details
                  regarding load balancer classes:

                    https://kubernetes.io/docs/concepts/services-networking/service/#load-balancer-class

                  If nil this policy applies to all services.
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
                          enum:
                          - In
                          - NotIn
                          - Exists
                          - DoesNotExist
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
                      description: MatchLabelsValue represents the value from the
                        MatchLabels {key,value} pair.
                      maxLength: 63
                      pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                      type: string
                    description: |-
                      matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                      map is equivalent to an element of matchExpressions, whose key field is "key", the
                      operator is "In", and the values array contains only "value". The requirements are ANDed.
                    type: object
                type: object
                x-kubernetes-map-type: atomic
            type: object
          status:
            description: Status is the status of the policy.
            properties:
              conditions:
                description: Current service state
                items:
                  description: Condition contains details for one aspect of the
                    current state of this API Resource.
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
                      description: status of the condition, one of True, False,
                        Unknown.
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
            type: object
        required:
        - metadata
        type: object
    served: true
    storage: true
    subresources:
      status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  labels:
    io.cilium.k8s.crd.schema.version: 1.30.8
  name: ciliumloadbalancerippools.cilium.io
spec:
  conversion:
    strategy: None
  group: cilium.io
  names:
    categories:
    - cilium
    kind: CiliumLoadBalancerIPPool
    listKind: CiliumLoadBalancerIPPoolList
    plural: ciliumloadbalancerippools
    shortNames:
    - ippools
    - ippool
    - lbippool
    - lbippools
    singular: ciliumloadbalancerippool
  scope: Cluster
  versions:
  - additionalPrinterColumns:
    - jsonPath: .spec.disabled
      name: Disabled
      type: boolean
    - jsonPath: .status.conditions[?(@.type=="cilium.io/PoolConflict")].status
      name: Conflicting
      type: string
    - jsonPath: .status.conditions[?(@.type=="cilium.io/IPsAvailable")].message
      name: IPs Available
      type: string
    - jsonPath: .metadata.creationTimestamp
      name: Age
      type: date
    name: v2alpha1
    schema:
      openAPIV3Schema:
        description: |-
          CiliumLoadBalancerIPPool is a Kubernetes third-party resource which
          is used to defined pools of IPs which the operator can use to to allocate
          and advertise IPs for Services of type LoadBalancer.
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
              Spec is a human readable description for a BGP load balancer
              ip pool.
            properties:
              allowFirstLastIPs:
                description: |-
                  AllowFirstLastIPs, if set to `Yes` or undefined means that the first and last IPs of each CIDR will be allocatable.
                  If `No`, these IPs will be reserved. This field is ignored for /{31,32} and /{127,128} CIDRs since
                  reserving the first and last IPs would make the CIDRs unusable.
                enum:
                - "Yes"
                - "No"
                type: string
              blocks:
                description: Blocks is a list of CIDRs comprising this IP Pool
                items:
                  description: CiliumLoadBalancerIPPoolIPBlock describes a single
                    IP block.
                  properties:
                    cidr:
                      format: cidr
                      type: string
                    start:
                      type: string
                    stop:
                      type: string
                  type: object
                type: array
              disabled:
                default: false
                description: |-
                  Disabled, if set to true means that no new IPs will be allocated from this pool.
                  Existing allocations will not be removed from services.
                type: boolean
              serviceSelector:
                description: ServiceSelector selects a set of services which are
                  eligible to receive IPs from this
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
                          enum:
                          - In
                          - NotIn
                          - Exists
                          - DoesNotExist
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
                      description: MatchLabelsValue represents the value from the
                        MatchLabels {key,value} pair.
                      maxLength: 63
                      pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                      type: string
                    description: |-
                      matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                      map is equivalent to an element of matchExpressions, whose key field is "key", the
                      operator is "In", and the values array contains only "value". The requirements are ANDed.
                    type: object
                type: object
                x-kubernetes-map-type: atomic
            type: object
          status:
            description: |-
              Status is the status of the IP Pool.

              It might be possible for users to define overlapping IP Pools, we can't validate or enforce non-overlapping pools
              during object creation. The Cilium operator will do this validation and update the status to reflect the ability
              to allocate IPs from this pool.
            properties:
              conditions:
                description: Current service state
                items:
                  description: Condition contains details for one aspect of the
                    current state of this API Resource.
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
                      description: status of the condition, one of True, False,
                        Unknown.
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
            type: object
        required:
        - metadata
        - spec
        type: object
    served: true
    storage: true
    subresources:
      status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  labels:
    io.cilium.k8s.crd.schema.version: 1.30.8
  name: ciliumnetworkpolicies.cilium.io
spec:
  conversion:
    strategy: None
  group: cilium.io
  names:
    categories:
    - cilium
    - ciliumpolicy
    kind: CiliumNetworkPolicy
    listKind: CiliumNetworkPolicyList
    plural: ciliumnetworkpolicies
    shortNames:
    - cnp
    - ciliumnp
    singular: ciliumnetworkpolicy
  scope: Namespaced
  versions:
  - additionalPrinterColumns:
    - jsonPath: .metadata.creationTimestamp
      name: Age
      type: date
    - jsonPath: .status.conditions[?(@.type=='Valid')].status
      name: Valid
      type: string
    name: v2
    schema:
      openAPIV3Schema:
        description: |-
          CiliumNetworkPolicy is a Kubernetes third-party resource with an extended
          version of NetworkPolicy.
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
            anyOf:
            - properties:
                ingress: {}
              required:
              - ingress
            - properties:
                ingressDeny: {}
              required:
              - ingressDeny
            - properties:
                egress: {}
              required:
              - egress
            - properties:
                egressDeny: {}
              required:
              - egressDeny
            description: Spec is the desired Cilium specific rule specification.
            oneOf:
            - properties:
                endpointSelector: {}
              required:
              - endpointSelector
            - properties:
                nodeSelector: {}
              required:
              - nodeSelector
            properties:
              description:
                description: |-
                  Description is a free form string, it can be used by the creator of
                  the rule to store human readable explanation of the purpose of this
                  rule. Rules cannot be identified by comment.
                type: string
              egress:
                description: |-
                  Egress is a list of EgressRule which are enforced at egress.
                  If omitted or empty, this rule does not apply at egress.
                items:
                  description: |-
                    EgressRule contains all rule types which can be applied at egress, i.e.
                    network traffic that originates inside the endpoint and exits the endpoint
                    selected by the endpointSelector.

                      - All members of this structure are optional. If omitted or empty, the
                        member will have no effect on the rule.

                      - If multiple members of the structure are specified, then all members
                        must match in order for the rule to take effect. The exception to this
                        rule is the ToRequires member; the effects of any Requires field in any
                        rule will apply to all other rules as well.

                      - ToEndpoints, ToCIDR, ToCIDRSet, ToEntities, ToServices and ToGroups are
                        mutually exclusive. Only one of these members may be present within an
                        individual rule.
                  properties:
                    authentication:
                      description: Authentication is the required authentication
                        type for the allowed traffic, if any.
                      properties:
                        mode:
                          description: Mode is the required authentication mode
                            for the allowed traffic, if any.
                          enum:
                          - disabled
                          - required
                          - test-always-fail
                          type: string
                      required:
                      - mode
                      type: object
                    icmps:
                      description: |-
                        ICMPs is a list of ICMP rule identified by type number
                        which the endpoint subject to the rule is allowed to connect to.

                        Example:
                        Any endpoint with the label "app=httpd" is allowed to initiate
                        type 8 ICMP connections.
                      items:
                        description: ICMPRule is a list of ICMP fields.
                        properties:
                          fields:
                            description: Fields is a list of ICMP fields.
                            items:
                              description: ICMPField is a ICMP field.
                              properties:
                                family:
                                  default: IPv4
                                  description: |-
                                    Family is a IP address version.
                                    Currently, we support `IPv4` and `IPv6`.
                                    `IPv4` is set as default.
                                  enum:
                                  - IPv4
                                  - IPv6
                                  type: string
                                type:
                                  anyOf:
                                  - type: integer
                                  - type: string
                                  description: "Type is a ICMP-type.\nIt should
                                    be an 8bit code (0-255), or it's CamelCase name
                                    (for example, \"EchoReply\").\nAllowed ICMP
                                    types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                    | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                    | RouterSelection | TimeExceeded | ParameterProblem
                                    |\n\t\t\t Timestamp | TimestampReply | Photuris
                                    | ExtendedEcho Request | ExtendedEcho Reply\n
                                    \   Ipv6: DestinationUnreachable | PacketTooBig
                                    | TimeExceeded | ParameterProblem |\n\t\t\t
                                    EchoRequest | EchoReply | MulticastListenerQuery|
                                    MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                    | RouterSolicitation | RouterAdvertisement |
                                    NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                    | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                    |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                    | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                    HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                    | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                    | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                    |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                  pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                    Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                  x-kubernetes-int-or-string: true
                              required:
                              - type
                              type: object
                            maxItems: 40
                            type: array
                        type: object
                      type: array
                    toCIDR:
                      description: |-
                        ToCIDR is a list of IP blocks which the endpoint subject to the rule
                        is allowed to initiate connections. Only connections destined for
                        outside of the cluster and not targeting the host will be subject
                        to CIDR rules.  This will match on the destination IP address of
                        outgoing connections. Adding a prefix into ToCIDR or into ToCIDRSet
                        with no ExcludeCIDRs is equivalent. Overlaps are allowed between
                        ToCIDR and ToCIDRSet.

                        Example:
                        Any endpoint with the label "app=database-proxy" is allowed to
                        initiate connections to 10.2.3.0/24
                      items:
                        description: |-
                          CIDR specifies a block of IP addresses.
                          Example: 192.0.2.1/32
                        format: cidr
                        type: string
                      type: array
                    toCIDRSet:
                      description: |-
                        ToCIDRSet is a list of IP blocks which the endpoint subject to the rule
                        is allowed to initiate connections to in addition to connections
                        which are allowed via ToEndpoints, along with a list of subnets contained
                        within their corresponding IP block to which traffic should not be
                        allowed. This will match on the destination IP address of outgoing
                        connections. Adding a prefix into ToCIDR or into ToCIDRSet with no
                        ExcludeCIDRs is equivalent. Overlaps are allowed between ToCIDR and
                        ToCIDRSet.

                        Example:
                        Any endpoint with the label "app=database-proxy" is allowed to
                        initiate connections to 10.2.3.0/24 except from IPs in subnet 10.2.3.0/28.
                      items:
                        description: |-
                          CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                          communication  is allowed, along with an optional list of subnets within that
                          CIDR prefix to/from which outside communication is not allowed.
                        oneOf:
                        - properties:
                            cidr: {}
                          required:
                          - cidr
                        - properties:
                            cidrGroupRef: {}
                          required:
                          - cidrGroupRef
                        - properties:
                            cidrGroupSelector: {}
                          required:
                          - cidrGroupSelector
                        properties:
                          cidr:
                            description: CIDR is a CIDR prefix / IP Block.
                            format: cidr
                            type: string
                          cidrGroupRef:
                            description: |-
                              CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                              A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                              the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                              connections from.
                            maxLength: 253
                            pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                            type: string
                          cidrGroupSelector:
                            description: |-
                              CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                              rather than by name.
                            properties:
                              matchExpressions:
                                description: matchExpressions is a list of label
                                  selector requirements. The requirements are ANDed.
                                items:
                                  description: |-
                                    A label selector requirement is a selector that contains values, a key, and an operator that
                                    relates the key and values.
                                  properties:
                                    key:
                                      description: key is the label key that the
                                        selector applies to.
                                      type: string
                                    operator:
                                      description: |-
                                        operator represents a key's relationship to a set of values.
                                        Valid operators are In, NotIn, Exists and DoesNotExist.
                                      enum:
                                      - In
                                      - NotIn
                                      - Exists
                                      - DoesNotExist
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
                                  description: MatchLabelsValue represents the value
                                    from the MatchLabels {key,value} pair.
                                  maxLength: 63
                                  pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                  type: string
                                description: |-
                                  matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                  map is equivalent to an element of matchExpressions, whose key field is "key", the
                                  operator is "In", and the values array contains only "value". The requirements are ANDed.
                                type: object
                            type: object
                            x-kubernetes-map-type: atomic
                          except:
                            description: |-
                              ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                              is not allowed to initiate connections to. These CIDR prefixes should be
                              contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                              supported yet.
                              These exceptions are only applied to the Cidr in this CIDRRule, and do not
                              apply to any other CIDR prefixes in any other CIDRRules.
                            items:
                              description: |-
                                CIDR specifies a block of IP addresses.
                                Example: 192.0.2.1/32
                              format: cidr
                              type: string
                            type: array
                        type: object
                      type: array
                    toEndpoints:
                      description: |-
                        ToEndpoints is a list of endpoints identified by an EndpointSelector to
                        which the endpoints subject to the rule are allowed to communicate.

                        Example:
                        Any endpoint with the label "role=frontend" can communicate with any
                        endpoint carrying the label "role=backend".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    toEntities:
                      description: |-
                        ToEntities is a list of special entities to which the endpoint subject
                        to the rule is allowed to initiate connections. Supported entities are
                        `world`, `cluster`,`host`,`remote-node`,`kube-apiserver`, `init`,
                        `health`,`unmanaged` and `all`.
                      items:
                        description: |-
                          Entity specifies the class of receiver/sender endpoints that do not have
                          individual identities.  Entities are used to describe "outside of cluster",
                          "host", etc.
                        enum:
                        - all
                        - world
                        - cluster
                        - host
                        - init
                        - ingress
                        - unmanaged
                        - remote-node
                        - health
                        - none
                        - kube-apiserver
                        type: string
                      type: array
                    toFQDNs:
                      description: |-
                        ToFQDN allows whitelisting DNS names in place of IPs. The IPs that result
                        from DNS resolution of `ToFQDN.MatchName`s are added to the same
                        EgressRule object as ToCIDRSet entries, and behave accordingly. Any L4 and
                        L7 rules within this EgressRule will also apply to these IPs.
                        The DNS -> IP mapping is re-resolved periodically from within the
                        cilium-agent, and the IPs in the DNS response are effected in the policy
                        for selected pods as-is (i.e. the list of IPs is not modified in any way).
                        Note: An explicit rule to allow for DNS traffic is needed for the pods, as
                        ToFQDN counts as an egress rule and will enforce egress policy when
                        PolicyEnforcment=default.
                        Note: If the resolved IPs are IPs within the kubernetes cluster, the
                        ToFQDN rule will not apply to that IP.
                        Note: ToFQDN cannot occur in the same policy as other To* rules.
                      items:
                        oneOf:
                        - properties:
                            matchName: {}
                          required:
                          - matchName
                        - properties:
                            matchPattern: {}
                          required:
                          - matchPattern
                        properties:
                          matchName:
                            description: |-
                              MatchName matches literal DNS names. A trailing "." is automatically added
                              when missing.
                            maxLength: 255
                            pattern: ^([-a-zA-Z0-9_]+[.]?)+$
                            type: string
                          matchPattern:
                            description: |-
                              MatchPattern allows using wildcards to match DNS names. All wildcards are
                              case insensitive. The wildcards are:
                              - "*" matches 0 or more DNS valid characters, and may occur anywhere in
                              the pattern. As a special case a "*" as the leftmost character, without a
                              following "." matches all subdomains as well as the name to the right.
                              A trailing "." is automatically added when missing.

                              Examples:
                              `*.cilium.io` matches subomains of cilium at that level
                                www.cilium.io and blog.cilium.io match, cilium.io and google.com do not
                              `*cilium.io` matches cilium.io and all subdomains ends with "cilium.io"
                                except those containing "." separator, subcilium.io and sub-cilium.io match,
                                www.cilium.io and blog.cilium.io does not
                              sub*.cilium.io matches subdomains of cilium where the subdomain component
                              begins with "sub"
                                sub.cilium.io and subdomain.cilium.io match, www.cilium.io,
                                blog.cilium.io, cilium.io and google.com do not
                            maxLength: 255
                            pattern: ^([-a-zA-Z0-9_*]+[.]?)+$
                            type: string
                        type: object
                      type: array
                    toGroups:
                      description: |-
                        ToGroups is a directive that allows the integration with multiple outside
                        providers. Currently, only AWS is supported, and the rule can select by
                        multiple sub directives:

                        Example:
                        toGroups:
                        - aws:
                            securityGroupsIds:
                            - 'sg-XXXXXXXXXXXXX'
                      items:
                        description: |-
                          Groups structure to store all kinds of new integrations that needs a new
                          derivative policy.
                        properties:
                          aws:
                            description: AWSGroup is an structure that can be used
                              to whitelisting information from AWS integration
                            properties:
                              labels:
                                additionalProperties:
                                  type: string
                                type: object
                              region:
                                type: string
                              securityGroupsIds:
                                items:
                                  type: string
                                type: array
                              securityGroupsNames:
                                items:
                                  type: string
                                type: array
                            type: object
                        type: object
                      type: array
                    toNodes:
                      description: |-
                        ToNodes is a list of nodes identified by an
                        EndpointSelector to which endpoints subject to the rule is allowed to communicate.
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    toPorts:
                      description: |-
                        ToPorts is a list of destination ports identified by port number and
                        protocol which the endpoint subject to the rule is allowed to
                        connect to.

                        Example:
                        Any endpoint with the label "role=frontend" is allowed to initiate
                        connections to destination port 8080/tcp
                      items:
                        description: |-
                          PortRule is a list of ports/protocol combinations with optional Layer 7
                          rules which must be met.
                        properties:
                          listener:
                            description: |-
                              listener specifies the name of a custom Envoy listener to which this traffic should be
                              redirected to.
                            properties:
                              envoyConfig:
                                description: |-
                                  EnvoyConfig is a reference to the CEC or CCEC resource in which
                                  the listener is defined.
                                properties:
                                  kind:
                                    description: |-
                                      Kind is the resource type being referred to. Defaults to CiliumEnvoyConfig or
                                      CiliumClusterwideEnvoyConfig for CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy,
                                      respectively. The only case this is currently explicitly needed is when referring to a
                                      CiliumClusterwideEnvoyConfig from CiliumNetworkPolicy, as using a namespaced listener
                                      from a cluster scoped policy is not allowed.
                                    enum:
                                    - CiliumEnvoyConfig
                                    - CiliumClusterwideEnvoyConfig
                                    type: string
                                  name:
                                    description: |-
                                      Name is the resource name of the CiliumEnvoyConfig or CiliumClusterwideEnvoyConfig where
                                      the listener is defined in.
                                    minLength: 1
                                    type: string
                                required:
                                - name
                                type: object
                              name:
                                description: Name is the name of the listener.
                                minLength: 1
                                type: string
                              priority:
                                description: |-
                                  Priority for this Listener that is used when multiple rules would apply different
                                  listeners to a policy map entry. Behavior of this is implementation dependent.
                                maximum: 100
                                minimum: 1
                                type: integer
                            required:
                            - envoyConfig
                            - name
                            type: object
                          originatingTLS:
                            description: |-
                              OriginatingTLS is the TLS context for the connections originated by
                              the L7 proxy.  For egress policy this specifies the client-side TLS
                              parameters for the upstream connection originating from the L7 proxy
                              to the remote destination. For ingress policy this specifies the
                              client-side TLS parameters for the connection from the L7 proxy to
                              the local endpoint.
                            properties:
                              certificate:
                                description: |-
                                  Certificate is the file name or k8s secret item name for the certificate
                                  chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                  item must exist.
                                type: string
                              privateKey:
                                description: |-
                                  PrivateKey is the file name or k8s secret item name for the private key
                                  matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                  exists. If given, the item must exist.
                                type: string
                              secret:
                                description: |-
                                  Secret is the secret that contains the certificates and private key for
                                  the TLS context.
                                  By default, Cilium will search in this secret for the following items:
                                    - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                    - 'tls.crt' - Which represents the public key certificate.
                                    - 'tls.key' - Which represents the private key matching the public key
                                                  certificate.
                                properties:
                                  name:
                                    description: Name is the name of the secret.
                                    type: string
                                  namespace:
                                    description: |-
                                      Namespace is the namespace in which the secret exists. Context of use
                                      determines the default value if left out (e.g., "default").
                                    type: string
                                required:
                                - name
                                type: object
                              trustedCA:
                                description: |-
                                  TrustedCA is the file name or k8s secret item name for the trusted CA.
                                  If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                  exist.
                                type: string
                            required:
                            - secret
                            type: object
                          ports:
                            description: Ports is a list of L4 port/protocol
                            items:
                              description: PortProtocol specifies an L4 port with
                                an optional transport protocol
                              properties:
                                endPort:
                                  description: EndPort can only be an L4 port number.
                                  format: int32
                                  maximum: 65535
                                  minimum: 0
                                  type: integer
                                port:
                                  description: |-
                                    Port can be an L4 port number, or a name in the form of "http"
                                    or "http-8080".
                                  pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                  type: string
                                protocol:
                                  description: |-
                                    Protocol is the L4 protocol. If omitted or empty, any protocol
                                    matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                    Matching on ICMP is not supported.

                                    Named port specified for a container may narrow this down, but may not
                                    contradict this.
                                  enum:
                                  - TCP
                                  - UDP
                                  - SCTP
                                  - ANY
                                  type: string
                              required:
                              - port
                              type: object
                            maxItems: 40
                            type: array
                          rules:
                            description: |-
                              Rules is a list of additional port level rules which must be met in
                              order for the PortRule to allow the traffic. If omitted or empty,
                              no layer 7 rules are enforced.
                            oneOf:
                            - properties:
                                http: {}
                              required:
                              - http
                            - properties:
                                kafka: {}
                              required:
                              - kafka
                            - properties:
                                dns: {}
                              required:
                              - dns
                            - properties:
                                l7proto: {}
                              required:
                              - l7proto
                            properties:
                              dns:
                                description: DNS-specific rules.
                                items:
                                  description: PortRuleDNS is a list of allowed
                                    DNS lookups.
                                  oneOf:
                                  - properties:
                                      matchName: {}
                                    required:
                                    - matchName
                                  - properties:
                                      matchPattern: {}
                                    required:
                                    - matchPattern
                                  properties:
                                    matchName:
                                      description: |-
                                        MatchName matches literal DNS names. A trailing "." is automatically added
                                        when missing.
                                      maxLength: 255
                                      pattern: ^([-a-zA-Z0-9_]+[.]?)+$
                                      type: string
                                    matchPattern:
                                      description: |-
                                        MatchPattern allows using wildcards to match DNS names. All wildcards are
                                        case insensitive. The wildcards are:
                                        - "*" matches 0 or more DNS valid characters, and may occur anywhere in
                                        the pattern. As a special case a "*" as the leftmost character, without a
                                        following "." matches all subdomains as well as the name to the right.
                                        A trailing "." is automatically added when missing.

                                        Examples:
                                        `*.cilium.io` matches subomains of cilium at that level
                                          www.cilium.io and blog.cilium.io match, cilium.io and google.com do not
                                        `*cilium.io` matches cilium.io and all subdomains ends with "cilium.io"
                                          except those containing "." separator, subcilium.io and sub-cilium.io match,
                                          www.cilium.io and blog.cilium.io does not
                                        sub*.cilium.io matches subdomains of cilium where the subdomain component
                                        begins with "sub"
                                          sub.cilium.io and subdomain.cilium.io match, www.cilium.io,
                                          blog.cilium.io, cilium.io and google.com do not
                                      maxLength: 255
                                      pattern: ^([-a-zA-Z0-9_*]+[.]?)+$
                                      type: string
                                  type: object
                                type: array
                              http:
                                description: HTTP specific rules.
                                items:
                                  description: |-
                                    PortRuleHTTP is a list of HTTP protocol constraints. All fields are
                                    optional, if all fields are empty or missing, the rule does not have any
                                    effect.

                                    All fields of this type are extended POSIX regex as defined by IEEE Std
                                    1003.1, (i.e this follows the egrep/unix syntax, not the perl syntax)
                                    matched against the path of an incoming request. Currently it can contain
                                    characters disallowed from the conventional "path" part of a URL as defined
                                    by RFC 3986.
                                  properties:
                                    headerMatches:
                                      description: |-
                                        HeaderMatches is a list of HTTP headers which must be
                                        present and match against the given values. Mismatch field can be used
                                        to specify what to do when there is no match.
                                      items:
                                        description: |-
                                          HeaderMatch extends the HeaderValue for matching requirement of a
                                          named header field against an immediate string, a secret value, or
                                          a regex.  If none of the optional fields is present, then the
                                          header value is not matched, only presence of the header is enough.
                                        properties:
                                          mismatch:
                                            description: |-
                                              Mismatch identifies what to do in case there is no match. The default is
                                              to drop the request. Otherwise the overall rule is still considered as
                                              matching, but the mismatches are logged in the access log.
                                            enum:
                                            - LOG
                                            - ADD
                                            - DELETE
                                            - REPLACE
                                            type: string
                                          name:
                                            description: Name identifies the header.
                                            minLength: 1
                                            type: string
                                          secret:
                                            description: |-
                                              Secret refers to a secret that contains the value to be matched against.
                                              The secret must only contain one entry. If the referred secret does not
                                              exist, and there is no "Value" specified, the match will fail.
                                            properties:
                                              name:
                                                description: Name is the name of
                                                  the secret.
                                                type: string
                                              namespace:
                                                description: |-
                                                  Namespace is the namespace in which the secret exists. Context of use
                                                  determines the default value if left out (e.g., "default").
                                                type: string
                                            required:
                                            - name
                                            type: object
                                          value:
                                            description: |-
                                              Value matches the exact value of the header. Can be specified either
                                              alone or together with "Secret"; will be used as the header value if the
                                              secret can not be found in the latter case.
                                            type: string
                                        required:
                                        - name
                                        type: object
                                      type: array
                                    headers:
                                      description: |-
                                        Headers is a list of HTTP headers which must be present in the
                                        request. If omitted or empty, requests are allowed regardless of
                                        headers present.
                                      items:
                                        type: string
                                      type: array
                                    host:
                                      description: |-
                                        Host is an extended POSIX regex matched against the host header of a
                                        request. Examples:

                                        - foo.bar.com will match the host fooXbar.com or foo-bar.com
                                        - foo\.bar\.com will only match the host foo.bar.com

                                        If omitted or empty, the value of the host header is ignored.
                                      format: idn-hostname
                                      type: string
                                    method:
                                      description: |-
                                        Method is an extended POSIX regex matched against the method of a
                                        request, e.g. "GET", "POST", "PUT", "PATCH", "DELETE", ...

                                        If omitted or empty, all methods are allowed.
                                      type: string
                                    path:
                                      description: |-
                                        Path is an extended POSIX regex matched against the path of a
                                        request. Currently it can contain characters disallowed from the
                                        conventional "path" part of a URL as defined by RFC 3986.

                                        If omitted or empty, all paths are all allowed.
                                      type: string
                                  type: object
                                type: array
                              kafka:
                                description: Kafka-specific rules.
                                items:
                                  description: |-
                                    PortRule is a list of Kafka protocol constraints. All fields are
                                    optional, if all fields are empty or missing, the rule will match all
                                    Kafka messages.
                                  properties:
                                    apiKey:
                                      description: |-
                                        APIKey is a case-insensitive string matched against the key of a
                                        request, e.g. "produce", "fetch", "createtopic", "deletetopic", et al
                                        Reference: https://kafka.apache.org/protocol#protocol_api_keys

                                        If omitted or empty, and if Role is not specified, then all keys are allowed.
                                      type: string
                                    apiVersion:
                                      description: |-
                                        APIVersion is the version matched against the api version of the
                                        Kafka message. If set, it has to be a string representing a positive
                                        integer.

                                        If omitted or empty, all versions are allowed.
                                      type: string
                                    clientID:
                                      description: |-
                                        ClientID is the client identifier as provided in the request.

                                        From Kafka protocol documentation:
                                        This is a user supplied identifier for the client application. The
                                        user can use any identifier they like and it will be used when
                                        logging errors, monitoring aggregates, etc. For example, one might
                                        want to monitor not just the requests per second overall, but the
                                        number coming from each client application (each of which could
                                        reside on multiple servers). This id acts as a logical grouping
                                        across all requests from a particular client.

                                        If omitted or empty, all client identifiers are allowed.
                                      type: string
                                    role:
                                      description: |-
                                        Role is a case-insensitive string and describes a group of API keys
                                        necessary to perform certain higher-level Kafka operations such as "produce"
                                        or "consume". A Role automatically expands into all APIKeys required
                                        to perform the specified higher-level operation.

                                        The following values are supported:
                                          - "produce": Allow producing to the topics specified in the rule
                                          - "consume": Allow consuming from the topics specified in the rule

                                        This field is incompatible with the APIKey field, i.e APIKey and Role
                                        cannot both be specified in the same rule.

                                        If omitted or empty, and if APIKey is not specified, then all keys are
                                        allowed.
                                      enum:
                                      - produce
                                      - consume
                                      type: string
                                    topic:
                                      description: |-
                                        Topic is the topic name contained in the message. If a Kafka request
                                        contains multiple topics, then all topics must be allowed or the
                                        message will be rejected.

                                        This constraint is ignored if the matched request message type
                                        doesn't contain any topic. Maximum size of Topic can be 249
                                        characters as per recent Kafka spec and allowed characters are
                                        a-z, A-Z, 0-9, -, . and _.

                                        Older Kafka versions had longer topic lengths of 255, but in Kafka 0.10
                                        version the length was changed from 255 to 249. For compatibility
                                        reasons we are using 255.

                                        If omitted or empty, all topics are allowed.
                                      maxLength: 255
                                      type: string
                                  type: object
                                type: array
                              l7:
                                description: Key-value pair rules.
                                items:
                                  additionalProperties:
                                    type: string
                                  description: |-
                                    PortRuleL7 is a list of key-value pairs interpreted by a L7 protocol as
                                    protocol constraints. All fields are optional, if all fields are empty or
                                    missing, the rule does not have any effect.
                                  type: object
                                type: array
                              l7proto:
                                description: Name of the L7 protocol for which the
                                  Key-value pair rules apply.
                                type: string
                            type: object
                          serverNames:
                            description: |-
                              ServerNames is a list of allowed TLS SNI values. If not empty, then
                              TLS must be present and one of the provided SNIs must be indicated in the
                              TLS handshake.
                            items:
                              type: string
                            type: array
                          terminatingTLS:
                            description: |-
                              TerminatingTLS is the TLS context for the connection terminated by
                              the L7 proxy.  For egress policy this specifies the server-side TLS
                              parameters to be applied on the connections originated from the local
                              endpoint and terminated by the L7 proxy. For ingress policy this specifies
                              the server-side TLS parameters to be applied on the connections
                              originated from a remote source and terminated by the L7 proxy.
                            properties:
                              certificate:
                                description: |-
                                  Certificate is the file name or k8s secret item name for the certificate
                                  chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                  item must exist.
                                type: string
                              privateKey:
                                description: |-
                                  PrivateKey is the file name or k8s secret item name for the private key
                                  matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                  exists. If given, the item must exist.
                                type: string
                              secret:
                                description: |-
                                  Secret is the secret that contains the certificates and private key for
                                  the TLS context.
                                  By default, Cilium will search in this secret for the following items:
                                    - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                    - 'tls.crt' - Which represents the public key certificate.
                                    - 'tls.key' - Which represents the private key matching the public key
                                                  certificate.
                                properties:
                                  name:
                                    description: Name is the name of the secret.
                                    type: string
                                  namespace:
                                    description: |-
                                      Namespace is the namespace in which the secret exists. Context of use
                                      determines the default value if left out (e.g., "default").
                                    type: string
                                required:
                                - name
                                type: object
                              trustedCA:
                                description: |-
                                  TrustedCA is the file name or k8s secret item name for the trusted CA.
                                  If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                  exist.
                                type: string
                            required:
                            - secret
                            type: object
                        type: object
                      type: array
                    toRequires:
                      description: |-
                        ToRequires is a list of additional constraints which must be met
                        in order for the selected endpoints to be able to connect to other
                        endpoints. These additional constraints do no by itself grant access
                        privileges and must always be accompanied with at least one matching
                        ToEndpoints.

                        Example:
                        Any Endpoint with the label "team=A" requires any endpoint to which it
                        communicates to also carry the label "team=A".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    toServices:
                      description: |-
                        ToServices is a list of services to which the endpoint subject
                        to the rule is allowed to initiate connections.
                        Currently Cilium only supports toServices for K8s services.
                      items:
                        description: |-
                          Service selects policy targets that are bundled as part of a
                          logical load-balanced service.

                          Currently only Kubernetes-based Services are supported.
                        properties:
                          k8sService:
                            description: K8sService selects service by name and
                              namespace pair
                            properties:
                              namespace:
                                type: string
                              serviceName:
                                type: string
                            type: object
                          k8sServiceSelector:
                            description: K8sServiceSelector selects services by
                              k8s labels and namespace
                            properties:
                              namespace:
                                type: string
                              selector:
                                description: ServiceSelector is a label selector
                                  for k8s services
                                properties:
                                  matchExpressions:
                                    description: matchExpressions is a list of label
                                      selector requirements. The requirements are
                                      ANDed.
                                    items:
                                      description: |-
                                        A label selector requirement is a selector that contains values, a key, and an operator that
                                        relates the key and values.
                                      properties:
                                        key:
                                          description: key is the label key that
                                            the selector applies to.
                                          type: string
                                        operator:
                                          description: |-
                                            operator represents a key's relationship to a set of values.
                                            Valid operators are In, NotIn, Exists and DoesNotExist.
                                          enum:
                                          - In
                                          - NotIn
                                          - Exists
                                          - DoesNotExist
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
                                      description: MatchLabelsValue represents the
                                        value from the MatchLabels {key,value} pair.
                                      maxLength: 63
                                      pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                      type: string
                                    description: |-
                                      matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                      map is equivalent to an element of matchExpressions, whose key field is "key", the
                                      operator is "In", and the values array contains only "value". The requirements are ANDed.
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                            required:
                            - selector
                            type: object
                        type: object
                      type: array
                  type: object
                type: array
              egressDeny:
                description: |-
                  EgressDeny is a list of EgressDenyRule which are enforced at egress.
                  Any rule inserted here will be denied regardless of the allowed egress
                  rules in the 'egress' field.
                  If omitted or empty, this rule does not apply at egress.
                items:
                  description: |-
                    EgressDenyRule contains all rule types which can be applied at egress, i.e.
                    network traffic that originates inside the endpoint and exits the endpoint
                    selected by the endpointSelector.

                      - All members of this structure are optional. If omitted or empty, the
                        member will have no effect on the rule.

                      - If multiple members of the structure are specified, then all members
                        must match in order for the rule to take effect. The exception to this
                        rule is the ToRequires member; the effects of any Requires field in any
                        rule will apply to all other rules as well.

                      - ToEndpoints, ToCIDR, ToCIDRSet, ToEntities, ToServices and ToGroups are
                        mutually exclusive. Only one of these members may be present within an
                        individual rule.
                  properties:
                    icmps:
                      description: |-
                        ICMPs is a list of ICMP rule identified by type number
                        which the endpoint subject to the rule is not allowed to connect to.

                        Example:
                        Any endpoint with the label "app=httpd" is not allowed to initiate
                        type 8 ICMP connections.
                      items:
                        description: ICMPRule is a list of ICMP fields.
                        properties:
                          fields:
                            description: Fields is a list of ICMP fields.
                            items:
                              description: ICMPField is a ICMP field.
                              properties:
                                family:
                                  default: IPv4
                                  description: |-
                                    Family is a IP address version.
                                    Currently, we support `IPv4` and `IPv6`.
                                    `IPv4` is set as default.
                                  enum:
                                  - IPv4
                                  - IPv6
                                  type: string
                                type:
                                  anyOf:
                                  - type: integer
                                  - type: string
                                  description: "Type is a ICMP-type.\nIt should
                                    be an 8bit code (0-255), or it's CamelCase name
                                    (for example, \"EchoReply\").\nAllowed ICMP
                                    types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                    | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                    | RouterSelection | TimeExceeded | ParameterProblem
                                    |\n\t\t\t Timestamp | TimestampReply | Photuris
                                    | ExtendedEcho Request | ExtendedEcho Reply\n
                                    \   Ipv6: DestinationUnreachable | PacketTooBig
                                    | TimeExceeded | ParameterProblem |\n\t\t\t
                                    EchoRequest | EchoReply | MulticastListenerQuery|
                                    MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                    | RouterSolicitation | RouterAdvertisement |
                                    NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                    | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                    |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                    | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                    HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                    | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                    | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                    |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                  pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                    Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                  x-kubernetes-int-or-string: true
                              required:
                              - type
                              type: object
                            maxItems: 40
                            type: array
                        type: object
                      type: array
                    toCIDR:
                      description: |-
                        ToCIDR is a list of IP blocks which the endpoint subject to the rule
                        is allowed to initiate connections. Only connections destined for
                        outside of the cluster and not targeting the host will be subject
                        to CIDR rules.  This will match on the destination IP address of
                        outgoing connections. Adding a prefix into ToCIDR or into ToCIDRSet
                        with no ExcludeCIDRs is equivalent. Overlaps are allowed between
                        ToCIDR and ToCIDRSet.

                        Example:
                        Any endpoint with the label "app=database-proxy" is allowed to
                        initiate connections to 10.2.3.0/24
                      items:
                        description: |-
                          CIDR specifies a block of IP addresses.
                          Example: 192.0.2.1/32
                        format: cidr
                        type: string
                      type: array
                    toCIDRSet:
                      description: |-
                        ToCIDRSet is a list of IP blocks which the endpoint subject to the rule
                        is allowed to initiate connections to in addition to connections
                        which are allowed via ToEndpoints, along with a list of subnets contained
                        within their corresponding IP block to which traffic should not be
                        allowed. This will match on the destination IP address of outgoing
                        connections. Adding a prefix into ToCIDR or into ToCIDRSet with no
                        ExcludeCIDRs is equivalent. Overlaps are allowed between ToCIDR and
                        ToCIDRSet.

                        Example:
                        Any endpoint with the label "app=database-proxy" is allowed to
                        initiate connections to 10.2.3.0/24 except from IPs in subnet 10.2.3.0/28.
                      items:
                        description: |-
                          CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                          communication  is allowed, along with an optional list of subnets within that
                          CIDR prefix to/from which outside communication is not allowed.
                        oneOf:
                        - properties:
                            cidr: {}
                          required:
                          - cidr
                        - properties:
                            cidrGroupRef: {}
                          required:
                          - cidrGroupRef
                        - properties:
                            cidrGroupSelector: {}
                          required:
                          - cidrGroupSelector
                        properties:
                          cidr:
                            description: CIDR is a CIDR prefix / IP Block.
                            format: cidr
                            type: string
                          cidrGroupRef:
                            description: |-
                              CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                              A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                              the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                              connections from.
                            maxLength: 253
                            pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                            type: string
                          cidrGroupSelector:
                            description: |-
                              CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                              rather than by name.
                            properties:
                              matchExpressions:
                                description: matchExpressions is a list of label
                                  selector requirements. The requirements are ANDed.
                                items:
                                  description: |-
                                    A label selector requirement is a selector that contains values, a key, and an operator that
                                    relates the key and values.
                                  properties:
                                    key:
                                      description: key is the label key that the
                                        selector applies to.
                                      type: string
                                    operator:
                                      description: |-
                                        operator represents a key's relationship to a set of values.
                                        Valid operators are In, NotIn, Exists and DoesNotExist.
                                      enum:
                                      - In
                                      - NotIn
                                      - Exists
                                      - DoesNotExist
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
                                  description: MatchLabelsValue represents the value
                                    from the MatchLabels {key,value} pair.
                                  maxLength: 63
                                  pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                  type: string
                                description: |-
                                  matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                  map is equivalent to an element of matchExpressions, whose key field is "key", the
                                  operator is "In", and the values array contains only "value". The requirements are ANDed.
                                type: object
                            type: object
                            x-kubernetes-map-type: atomic
                          except:
                            description: |-
                              ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                              is not allowed to initiate connections to. These CIDR prefixes should be
                              contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                              supported yet.
                              These exceptions are only applied to the Cidr in this CIDRRule, and do not
                              apply to any other CIDR prefixes in any other CIDRRules.
                            items:
                              description: |-
                                CIDR specifies a block of IP addresses.
                                Example: 192.0.2.1/32
                              format: cidr
                              type: string
                            type: array
                        type: object
                      type: array
                    toEndpoints:
                      description: |-
                        ToEndpoints is a list of endpoints identified by an EndpointSelector to
                        which the endpoints subject to the rule are allowed to communicate.

                        Example:
                        Any endpoint with the label "role=frontend" can communicate with any
                        endpoint carrying the label "role=backend".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    toEntities:
                      description: |-
                        ToEntities is a list of special entities to which the endpoint subject
                        to the rule is allowed to initiate connections. Supported entities are
                        `world`, `cluster`,`host`,`remote-node`,`kube-apiserver`, `init`,
                        `health`,`unmanaged` and `all`.
                      items:
                        description: |-
                          Entity specifies the class of receiver/sender endpoints that do not have
                          individual identities.  Entities are used to describe "outside of cluster",
                          "host", etc.
                        enum:
                        - all
                        - world
                        - cluster
                        - host
                        - init
                        - ingress
                        - unmanaged
                        - remote-node
                        - health
                        - none
                        - kube-apiserver
                        type: string
                      type: array
                    toGroups:
                      description: |-
                        ToGroups is a directive that allows the integration with multiple outside
                        providers. Currently, only AWS is supported, and the rule can select by
                        multiple sub directives:

                        Example:
                        toGroups:
                        - aws:
                            securityGroupsIds:
                            - 'sg-XXXXXXXXXXXXX'
                      items:
                        description: |-
                          Groups structure to store all kinds of new integrations that needs a new
                          derivative policy.
                        properties:
                          aws:
                            description: AWSGroup is an structure that can be used
                              to whitelisting information from AWS integration
                            properties:
                              labels:
                                additionalProperties:
                                  type: string
                                type: object
                              region:
                                type: string
                              securityGroupsIds:
                                items:
                                  type: string
                                type: array
                              securityGroupsNames:
                                items:
                                  type: string
                                type: array
                            type: object
                        type: object
                      type: array
                    toNodes:
                      description: |-
                        ToNodes is a list of nodes identified by an
                        EndpointSelector to which endpoints subject to the rule is allowed to communicate.
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    toPorts:
                      description: |-
                        ToPorts is a list of destination ports identified by port number and
                        protocol which the endpoint subject to the rule is not allowed to connect
                        to.

                        Example:
                        Any endpoint with the label "role=frontend" is not allowed to initiate
                        connections to destination port 8080/tcp
                      items:
                        description: |-
                          PortDenyRule is a list of ports/protocol that should be used for deny
                          policies. This structure lacks the L7Rules since it's not supported in deny
                          policies.
                        properties:
                          ports:
                            description: Ports is a list of L4 port/protocol
                            items:
                              description: PortProtocol specifies an L4 port with
                                an optional transport protocol
                              properties:
                                endPort:
                                  description: EndPort can only be an L4 port number.
                                  format: int32
                                  maximum: 65535
                                  minimum: 0
                                  type: integer
                                port:
                                  description: |-
                                    Port can be an L4 port number, or a name in the form of "http"
                                    or "http-8080".
                                  pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                  type: string
                                protocol:
                                  description: |-
                                    Protocol is the L4 protocol. If omitted or empty, any protocol
                                    matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                    Matching on ICMP is not supported.

                                    Named port specified for a container may narrow this down, but may not
                                    contradict this.
                                  enum:
                                  - TCP
                                  - UDP
                                  - SCTP
                                  - ANY
                                  type: string
                              required:
                              - port
                              type: object
                            type: array
                        type: object
                      type: array
                    toRequires:
                      description: |-
                        ToRequires is a list of additional constraints which must be met
                        in order for the selected endpoints to be able to connect to other
                        endpoints. These additional constraints do no by itself grant access
                        privileges and must always be accompanied with at least one matching
                        ToEndpoints.

                        Example:
                        Any Endpoint with the label "team=A" requires any endpoint to which it
                        communicates to also carry the label "team=A".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    toServices:
                      description: |-
                        ToServices is a list of services to which the endpoint subject
                        to the rule is allowed to initiate connections.
                        Currently Cilium only supports toServices for K8s services.
                      items:
                        description: |-
                          Service selects policy targets that are bundled as part of a
                          logical load-balanced service.

                          Currently only Kubernetes-based Services are supported.
                        properties:
                          k8sService:
                            description: K8sService selects service by name and
                              namespace pair
                            properties:
                              namespace:
                                type: string
                              serviceName:
                                type: string
                            type: object
                          k8sServiceSelector:
                            description: K8sServiceSelector selects services by
                              k8s labels and namespace
                            properties:
                              namespace:
                                type: string
                              selector:
                                description: ServiceSelector is a label selector
                                  for k8s services
                                properties:
                                  matchExpressions:
                                    description: matchExpressions is a list of label
                                      selector requirements. The requirements are
                                      ANDed.
                                    items:
                                      description: |-
                                        A label selector requirement is a selector that contains values, a key, and an operator that
                                        relates the key and values.
                                      properties:
                                        key:
                                          description: key is the label key that
                                            the selector applies to.
                                          type: string
                                        operator:
                                          description: |-
                                            operator represents a key's relationship to a set of values.
                                            Valid operators are In, NotIn, Exists and DoesNotExist.
                                          enum:
                                          - In
                                          - NotIn
                                          - Exists
                                          - DoesNotExist
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
                                      description: MatchLabelsValue represents the
                                        value from the MatchLabels {key,value} pair.
                                      maxLength: 63
                                      pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                      type: string
                                    description: |-
                                      matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                      map is equivalent to an element of matchExpressions, whose key field is "key", the
                                      operator is "In", and the values array contains only "value". The requirements are ANDed.
                                    type: object
                                type: object
                                x-kubernetes-map-type: atomic
                            required:
                            - selector
                            type: object
                        type: object
                      type: array
                  type: object
                type: array
              enableDefaultDeny:
                description: |-
                  EnableDefaultDeny determines whether this policy configures the
                  subject endpoint(s) to have a default deny mode. If enabled,
                  this causes all traffic not explicitly allowed by a network policy
                  to be dropped.

                  If not specified, the default is true for each traffic direction
                  that has rules, and false otherwise. For example, if a policy
                  only has Ingress or IngressDeny rules, then the default for
                  ingress is true and egress is false.

                  If multiple policies apply to an endpoint, that endpoint's default deny
                  will be enabled if any policy requests it.

                  This is useful for creating broad-based network policies that will not
                  cause endpoints to enter default-deny mode.
                properties:
                  egress:
                    description: |-
                      Whether or not the endpoint should have a default-deny rule applied
                      to egress traffic.
                    type: boolean
                  ingress:
                    description: |-
                      Whether or not the endpoint should have a default-deny rule applied
                      to ingress traffic.
                    type: boolean
                type: object
              endpointSelector:
                description: |-
                  EndpointSelector selects all endpoints which should be subject to
                  this rule. EndpointSelector and NodeSelector cannot be both empty and
                  are mutually exclusive.
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
                          enum:
                          - In
                          - NotIn
                          - Exists
                          - DoesNotExist
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
                      description: MatchLabelsValue represents the value from the
                        MatchLabels {key,value} pair.
                      maxLength: 63
                      pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                      type: string
                    description: |-
                      matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                      map is equivalent to an element of matchExpressions, whose key field is "key", the
                      operator is "In", and the values array contains only "value". The requirements are ANDed.
                    type: object
                type: object
                x-kubernetes-map-type: atomic
              ingress:
                description: |-
                  Ingress is a list of IngressRule which are enforced at ingress.
                  If omitted or empty, this rule does not apply at ingress.
                items:
                  description: |-
                    IngressRule contains all rule types which can be applied at ingress,
                    i.e. network traffic that originates outside of the endpoint and
                    is entering the endpoint selected by the endpointSelector.

                      - All members of this structure are optional. If omitted or empty, the
                        member will have no effect on the rule.

                      - If multiple members are set, all of them need to match in order for
                        the rule to take effect. The exception to this rule is FromRequires field;
                        the effects of any Requires field in any rule will apply to all other
                        rules as well.

                      - FromEndpoints, FromCIDR, FromCIDRSet and FromEntities are mutually
                        exclusive. Only one of these members may be present within an individual
                        rule.
                  properties:
                    authentication:
                      description: Authentication is the required authentication
                        type for the allowed traffic, if any.
                      properties:
                        mode:
                          description: Mode is the required authentication mode
                            for the allowed traffic, if any.
                          enum:
                          - disabled
                          - required
                          - test-always-fail
                          type: string
                      required:
                      - mode
                      type: object
                    fromCIDR:
                      description: |-
                        FromCIDR is a list of IP blocks which the endpoint subject to the
                        rule is allowed to receive connections from. Only connections which
                        do *not* originate from the cluster or from the local host are subject
                        to CIDR rules. In order to allow in-cluster connectivity, use the
                        FromEndpoints field.  This will match on the source IP address of
                        incoming connections. Adding  a prefix into FromCIDR or into
                        FromCIDRSet with no ExcludeCIDRs is  equivalent.  Overlaps are
                        allowed between FromCIDR and FromCIDRSet.

                        Example:
                        Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                        connections from 10.3.9.1
                      items:
                        description: |-
                          CIDR specifies a block of IP addresses.
                          Example: 192.0.2.1/32
                        format: cidr
                        type: string
                      type: array
                    fromCIDRSet:
                      description: |-
                        FromCIDRSet is a list of IP blocks which the endpoint subject to the
                        rule is allowed to receive connections from in addition to FromEndpoints,
                        along with a list of subnets contained within their corresponding IP block
                        from which traffic should not be allowed.
                        This will match on the source IP address of incoming connections. Adding
                        a prefix into FromCIDR or into FromCIDRSet with no ExcludeCIDRs is
                        equivalent. Overlaps are allowed between FromCIDR and FromCIDRSet.

                        Example:
                        Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                        connections from 10.0.0.0/8 except from IPs in subnet 10.96.0.0/12.
                      items:
                        description: |-
                          CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                          communication  is allowed, along with an optional list of subnets within that
                          CIDR prefix to/from which outside communication is not allowed.
                        oneOf:
                        - properties:
                            cidr: {}
                          required:
                          - cidr
                        - properties:
                            cidrGroupRef: {}
                          required:
                          - cidrGroupRef
                        - properties:
                            cidrGroupSelector: {}
                          required:
                          - cidrGroupSelector
                        properties:
                          cidr:
                            description: CIDR is a CIDR prefix / IP Block.
                            format: cidr
                            type: string
                          cidrGroupRef:
                            description: |-
                              CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                              A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                              the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                              connections from.
                            maxLength: 253
                            pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                            type: string
                          cidrGroupSelector:
                            description: |-
                              CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                              rather than by name.
                            properties:
                              matchExpressions:
                                description: matchExpressions is a list of label
                                  selector requirements. The requirements are ANDed.
                                items:
                                  description: |-
                                    A label selector requirement is a selector that contains values, a key, and an operator that
                                    relates the key and values.
                                  properties:
                                    key:
                                      description: key is the label key that the
                                        selector applies to.
                                      type: string
                                    operator:
                                      description: |-
                                        operator represents a key's relationship to a set of values.
                                        Valid operators are In, NotIn, Exists and DoesNotExist.
                                      enum:
                                      - In
                                      - NotIn
                                      - Exists
                                      - DoesNotExist
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
                                  description: MatchLabelsValue represents the value
                                    from the MatchLabels {key,value} pair.
                                  maxLength: 63
                                  pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                  type: string
                                description: |-
                                  matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                  map is equivalent to an element of matchExpressions, whose key field is "key", the
                                  operator is "In", and the values array contains only "value". The requirements are ANDed.
                                type: object
                            type: object
                            x-kubernetes-map-type: atomic
                          except:
                            description: |-
                              ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                              is not allowed to initiate connections to. These CIDR prefixes should be
                              contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                              supported yet.
                              These exceptions are only applied to the Cidr in this CIDRRule, and do not
                              apply to any other CIDR prefixes in any other CIDRRules.
                            items:
                              description: |-
                                CIDR specifies a block of IP addresses.
                                Example: 192.0.2.1/32
                              format: cidr
                              type: string
                            type: array
                        type: object
                      type: array
                    fromEndpoints:
                      description: |-
                        FromEndpoints is a list of endpoints identified by an
                        EndpointSelector which are allowed to communicate with the endpoint
                        subject to the rule.

                        Example:
                        Any endpoint with the label "role=backend" can be consumed by any
                        endpoint carrying the label "role=frontend".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    fromEntities:
                      description: |-
                        FromEntities is a list of special entities which the endpoint subject
                        to the rule is allowed to receive connections from. Supported entities are
                        `world`, `cluster` and `host`
                      items:
                        description: |-
                          Entity specifies the class of receiver/sender endpoints that do not have
                          individual identities.  Entities are used to describe "outside of cluster",
                          "host", etc.
                        enum:
                        - all
                        - world
                        - cluster
                        - host
                        - init
                        - ingress
                        - unmanaged
                        - remote-node
                        - health
                        - none
                        - kube-apiserver
                        type: string
                      type: array
                    fromGroups:
                      description: |-
                        FromGroups is a directive that allows the integration with multiple outside
                        providers. Currently, only AWS is supported, and the rule can select by
                        multiple sub directives:

                        Example:
                        FromGroups:
                        - aws:
                            securityGroupsIds:
                            - 'sg-XXXXXXXXXXXXX'
                      items:
                        description: |-
                          Groups structure to store all kinds of new integrations that needs a new
                          derivative policy.
                        properties:
                          aws:
                            description: AWSGroup is an structure that can be used
                              to whitelisting information from AWS integration
                            properties:
                              labels:
                                additionalProperties:
                                  type: string
                                type: object
                              region:
                                type: string
                              securityGroupsIds:
                                items:
                                  type: string
                                type: array
                              securityGroupsNames:
                                items:
                                  type: string
                                type: array
                            type: object
                        type: object
                      type: array
                    fromNodes:
                      description: |-
                        FromNodes is a list of nodes identified by an
                        EndpointSelector which are allowed to communicate with the endpoint
                        subject to the rule.
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    fromRequires:
                      description: |-
                        FromRequires is a list of additional constraints which must be met
                        in order for the selected endpoints to be reachable. These
                        additional constraints do no by itself grant access privileges and
                        must always be accompanied with at least one matching FromEndpoints.

                        Example:
                        Any Endpoint with the label "team=A" requires consuming endpoint
                        to also carry the label "team=A".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    icmps:
                      description: |-
                        ICMPs is a list of ICMP rule identified by type number
                        which the endpoint subject to the rule is allowed to
                        receive connections on.

                        Example:
                        Any endpoint with the label "app=httpd" can only accept incoming
                        type 8 ICMP connections.
                      items:
                        description: ICMPRule is a list of ICMP fields.
                        properties:
                          fields:
                            description: Fields is a list of ICMP fields.
                            items:
                              description: ICMPField is a ICMP field.
                              properties:
                                family:
                                  default: IPv4
                                  description: |-
                                    Family is a IP address version.
                                    Currently, we support `IPv4` and `IPv6`.
                                    `IPv4` is set as default.
                                  enum:
                                  - IPv4
                                  - IPv6
                                  type: string
                                type:
                                  anyOf:
                                  - type: integer
                                  - type: string
                                  description: "Type is a ICMP-type.\nIt should
                                    be an 8bit code (0-255), or it's CamelCase name
                                    (for example, \"EchoReply\").\nAllowed ICMP
                                    types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                    | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                    | RouterSelection | TimeExceeded | ParameterProblem
                                    |\n\t\t\t Timestamp | TimestampReply | Photuris
                                    | ExtendedEcho Request | ExtendedEcho Reply\n
                                    \   Ipv6: DestinationUnreachable | PacketTooBig
                                    | TimeExceeded | ParameterProblem |\n\t\t\t
                                    EchoRequest | EchoReply | MulticastListenerQuery|
                                    MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                    | RouterSolicitation | RouterAdvertisement |
                                    NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                    | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                    |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                    | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                    HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                    | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                    | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                    |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                  pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                    Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                  x-kubernetes-int-or-string: true
                              required:
                              - type
                              type: object
                            maxItems: 40
                            type: array
                        type: object
                      type: array
                    toPorts:
                      description: |-
                        ToPorts is a list of destination ports identified by port number and
                        protocol which the endpoint subject to the rule is allowed to
                        receive connections on.

                        Example:
                        Any endpoint with the label "app=httpd" can only accept incoming
                        connections on port 80/tcp.
                      items:
                        description: |-
                          PortRule is a list of ports/protocol combinations with optional Layer 7
                          rules which must be met.
                        properties:
                          listener:
                            description: |-
                              listener specifies the name of a custom Envoy listener to which this traffic should be
                              redirected to.
                            properties:
                              envoyConfig:
                                description: |-
                                  EnvoyConfig is a reference to the CEC or CCEC resource in which
                                  the listener is defined.
                                properties:
                                  kind:
                                    description: |-
                                      Kind is the resource type being referred to. Defaults to CiliumEnvoyConfig or
                                      CiliumClusterwideEnvoyConfig for CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy,
                                      respectively. The only case this is currently explicitly needed is when referring to a
                                      CiliumClusterwideEnvoyConfig from CiliumNetworkPolicy, as using a namespaced listener
                                      from a cluster scoped policy is not allowed.
                                    enum:
                                    - CiliumEnvoyConfig
                                    - CiliumClusterwideEnvoyConfig
                                    type: string
                                  name:
                                    description: |-
                                      Name is the resource name of the CiliumEnvoyConfig or CiliumClusterwideEnvoyConfig where
                                      the listener is defined in.
                                    minLength: 1
                                    type: string
                                required:
                                - name
                                type: object
                              name:
                                description: Name is the name of the listener.
                                minLength: 1
                                type: string
                              priority:
                                description: |-
                                  Priority for this Listener that is used when multiple rules would apply different
                                  listeners to a policy map entry. Behavior of this is implementation dependent.
                                maximum: 100
                                minimum: 1
                                type: integer
                            required:
                            - envoyConfig
                            - name
                            type: object
                          originatingTLS:
                            description: |-
                              OriginatingTLS is the TLS context for the connections originated by
                              the L7 proxy.  For egress policy this specifies the client-side TLS
                              parameters for the upstream connection originating from the L7 proxy
                              to the remote destination. For ingress policy this specifies the
                              client-side TLS parameters for the connection from the L7 proxy to
                              the local endpoint.
                            properties:
                              certificate:
                                description: |-
                                  Certificate is the file name or k8s secret item name for the certificate
                                  chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                  item must exist.
                                type: string
                              privateKey:
                                description: |-
                                  PrivateKey is the file name or k8s secret item name for the private key
                                  matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                  exists. If given, the item must exist.
                                type: string
                              secret:
                                description: |-
                                  Secret is the secret that contains the certificates and private key for
                                  the TLS context.
                                  By default, Cilium will search in this secret for the following items:
                                    - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                    - 'tls.crt' - Which represents the public key certificate.
                                    - 'tls.key' - Which represents the private key matching the public key
                                                  certificate.
                                properties:
                                  name:
                                    description: Name is the name of the secret.
                                    type: string
                                  namespace:
                                    description: |-
                                      Namespace is the namespace in which the secret exists. Context of use
                                      determines the default value if left out (e.g., "default").
                                    type: string
                                required:
                                - name
                                type: object
                              trustedCA:
                                description: |-
                                  TrustedCA is the file name or k8s secret item name for the trusted CA.
                                  If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                  exist.
                                type: string
                            required:
                            - secret
                            type: object
                          ports:
                            description: Ports is a list of L4 port/protocol
                            items:
                              description: PortProtocol specifies an L4 port with
                                an optional transport protocol
                              properties:
                                endPort:
                                  description: EndPort can only be an L4 port number.
                                  format: int32
                                  maximum: 65535
                                  minimum: 0
                                  type: integer
                                port:
                                  description: |-
                                    Port can be an L4 port number, or a name in the form of "http"
                                    or "http-8080".
                                  pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                  type: string
                                protocol:
                                  description: |-
                                    Protocol is the L4 protocol. If omitted or empty, any protocol
                                    matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                    Matching on ICMP is not supported.

                                    Named port specified for a container may narrow this down, but may not
                                    contradict this.
                                  enum:
                                  - TCP
                                  - UDP
                                  - SCTP
                                  - ANY
                                  type: string
                              required:
                              - port
                              type: object
                            maxItems: 40
                            type: array
                          rules:
                            description: |-
                              Rules is a list of additional port level rules which must be met in
                              order for the PortRule to allow the traffic. If omitted or empty,
                              no layer 7 rules are enforced.
                            oneOf:
                            - properties:
                                http: {}
                              required:
                              - http
                            - properties:
                                kafka: {}
                              required:
                              - kafka
                            - properties:
                                dns: {}
                              required:
                              - dns
                            - properties:
                                l7proto: {}
                              required:
                              - l7proto
                            properties:
                              dns:
                                description: DNS-specific rules.
                                items:
                                  description: PortRuleDNS is a list of allowed
                                    DNS lookups.
                                  oneOf:
                                  - properties:
                                      matchName: {}
                                    required:
                                    - matchName
                                  - properties:
                                      matchPattern: {}
                                    required:
                                    - matchPattern
                                  properties:
                                    matchName:
                                      description: |-
                                        MatchName matches literal DNS names. A trailing "." is automatically added
                                        when missing.
                                      maxLength: 255
                                      pattern: ^([-a-zA-Z0-9_]+[.]?)+$
                                      type: string
                                    matchPattern:
                                      description: |-
                                        MatchPattern allows using wildcards to match DNS names. All wildcards are
                                        case insensitive. The wildcards are:
                                        - "*" matches 0 or more DNS valid characters, and may occur anywhere in
                                        the pattern. As a special case a "*" as the leftmost character, without a
                                        following "." matches all subdomains as well as the name to the right.
                                        A trailing "." is automatically added when missing.

                                        Examples:
                                        `*.cilium.io` matches subomains of cilium at that level
                                          www.cilium.io and blog.cilium.io match, cilium.io and google.com do not
                                        `*cilium.io` matches cilium.io and all subdomains ends with "cilium.io"
                                          except those containing "." separator, subcilium.io and sub-cilium.io match,
                                          www.cilium.io and blog.cilium.io does not
                                        sub*.cilium.io matches subdomains of cilium where the subdomain component
                                        begins with "sub"
                                          sub.cilium.io and subdomain.cilium.io match, www.cilium.io,
                                          blog.cilium.io, cilium.io and google.com do not
                                      maxLength: 255
                                      pattern: ^([-a-zA-Z0-9_*]+[.]?)+$
                                      type: string
                                  type: object
                                type: array
                              http:
                                description: HTTP specific rules.
                                items:
                                  description: |-
                                    PortRuleHTTP is a list of HTTP protocol constraints. All fields are
                                    optional, if all fields are empty or missing, the rule does not have any
                                    effect.

                                    All fields of this type are extended POSIX regex as defined by IEEE Std
                                    1003.1, (i.e this follows the egrep/unix syntax, not the perl syntax)
                                    matched against the path of an incoming request. Currently it can contain
                                    characters disallowed from the conventional "path" part of a URL as defined
                                    by RFC 3986.
                                  properties:
                                    headerMatches:
                                      description: |-
                                        HeaderMatches is a list of HTTP headers which must be
                                        present and match against the given values. Mismatch field can be used
                                        to specify what to do when there is no match.
                                      items:
                                        description: |-
                                          HeaderMatch extends the HeaderValue for matching requirement of a
                                          named header field against an immediate string, a secret value, or
                                          a regex.  If none of the optional fields is present, then the
                                          header value is not matched, only presence of the header is enough.
                                        properties:
                                          mismatch:
                                            description: |-
                                              Mismatch identifies what to do in case there is no match. The default is
                                              to drop the request. Otherwise the overall rule is still considered as
                                              matching, but the mismatches are logged in the access log.
                                            enum:
                                            - LOG
                                            - ADD
                                            - DELETE
                                            - REPLACE
                                            type: string
                                          name:
                                            description: Name identifies the header.
                                            minLength: 1
                                            type: string
                                          secret:
                                            description: |-
                                              Secret refers to a secret that contains the value to be matched against.
                                              The secret must only contain one entry. If the referred secret does not
                                              exist, and there is no "Value" specified, the match will fail.
                                            properties:
                                              name:
                                                description: Name is the name of
                                                  the secret.
                                                type: string
                                              namespace:
                                                description: |-
                                                  Namespace is the namespace in which the secret exists. Context of use
                                                  determines the default value if left out (e.g., "default").
                                                type: string
                                            required:
                                            - name
                                            type: object
                                          value:
                                            description: |-
                                              Value matches the exact value of the header. Can be specified either
                                              alone or together with "Secret"; will be used as the header value if the
                                              secret can not be found in the latter case.
                                            type: string
                                        required:
                                        - name
                                        type: object
                                      type: array
                                    headers:
                                      description: |-
                                        Headers is a list of HTTP headers which must be present in the
                                        request. If omitted or empty, requests are allowed regardless of
                                        headers present.
                                      items:
                                        type: string
                                      type: array
                                    host:
                                      description: |-
                                        Host is an extended POSIX regex matched against the host header of a
                                        request. Examples:

                                        - foo.bar.com will match the host fooXbar.com or foo-bar.com
                                        - foo\.bar\.com will only match the host foo.bar.com

                                        If omitted or empty, the value of the host header is ignored.
                                      format: idn-hostname
                                      type: string
                                    method:
                                      description: |-
                                        Method is an extended POSIX regex matched against the method of a
                                        request, e.g. "GET", "POST", "PUT", "PATCH", "DELETE", ...

                                        If omitted or empty, all methods are allowed.
                                      type: string
                                    path:
                                      description: |-
                                        Path is an extended POSIX regex matched against the path of a
                                        request. Currently it can contain characters disallowed from the
                                        conventional "path" part of a URL as defined by RFC 3986.

                                        If omitted or empty, all paths are all allowed.
                                      type: string
                                  type: object
                                type: array
                              kafka:
                                description: Kafka-specific rules.
                                items:
                                  description: |-
                                    PortRule is a list of Kafka protocol constraints. All fields are
                                    optional, if all fields are empty or missing, the rule will match all
                                    Kafka messages.
                                  properties:
                                    apiKey:
                                      description: |-
                                        APIKey is a case-insensitive string matched against the key of a
                                        request, e.g. "produce", "fetch", "createtopic", "deletetopic", et al
                                        Reference: https://kafka.apache.org/protocol#protocol_api_keys

                                        If omitted or empty, and if Role is not specified, then all keys are allowed.
                                      type: string
                                    apiVersion:
                                      description: |-
                                        APIVersion is the version matched against the api version of the
                                        Kafka message. If set, it has to be a string representing a positive
                                        integer.

                                        If omitted or empty, all versions are allowed.
                                      type: string
                                    clientID:
                                      description: |-
                                        ClientID is the client identifier as provided in the request.

                                        From Kafka protocol documentation:
                                        This is a user supplied identifier for the client application. The
                                        user can use any identifier they like and it will be used when
                                        logging errors, monitoring aggregates, etc. For example, one might
                                        want to monitor not just the requests per second overall, but the
                                        number coming from each client application (each of which could
                                        reside on multiple servers). This id acts as a logical grouping
                                        across all requests from a particular client.

                                        If omitted or empty, all client identifiers are allowed.
                                      type: string
                                    role:
                                      description: |-
                                        Role is a case-insensitive string and describes a group of API keys
                                        necessary to perform certain higher-level Kafka operations such as "produce"
                                        or "consume". A Role automatically expands into all APIKeys required
                                        to perform the specified higher-level operation.

                                        The following values are supported:
                                          - "produce": Allow producing to the topics specified in the rule
                                          - "consume": Allow consuming from the topics specified in the rule

                                        This field is incompatible with the APIKey field, i.e APIKey and Role
                                        cannot both be specified in the same rule.

                                        If omitted or empty, and if APIKey is not specified, then all keys are
                                        allowed.
                                      enum:
                                      - produce
                                      - consume
                                      type: string
                                    topic:
                                      description: |-
                                        Topic is the topic name contained in the message. If a Kafka request
                                        contains multiple topics, then all topics must be allowed or the
                                        message will be rejected.

                                        This constraint is ignored if the matched request message type
                                        doesn't contain any topic. Maximum size of Topic can be 249
                                        characters as per recent Kafka spec and allowed characters are
                                        a-z, A-Z, 0-9, -, . and _.

                                        Older Kafka versions had longer topic lengths of 255, but in Kafka 0.10
                                        version the length was changed from 255 to 249. For compatibility
                                        reasons we are using 255.

                                        If omitted or empty, all topics are allowed.
                                      maxLength: 255
                                      type: string
                                  type: object
                                type: array
                              l7:
                                description: Key-value pair rules.
                                items:
                                  additionalProperties:
                                    type: string
                                  description: |-
                                    PortRuleL7 is a list of key-value pairs interpreted by a L7 protocol as
                                    protocol constraints. All fields are optional, if all fields are empty or
                                    missing, the rule does not have any effect.
                                  type: object
                                type: array
                              l7proto:
                                description: Name of the L7 protocol for which the
                                  Key-value pair rules apply.
                                type: string
                            type: object
                          serverNames:
                            description: |-
                              ServerNames is a list of allowed TLS SNI values. If not empty, then
                              TLS must be present and one of the provided SNIs must be indicated in the
                              TLS handshake.
                            items:
                              type: string
                            type: array
                          terminatingTLS:
                            description: |-
                              TerminatingTLS is the TLS context for the connection terminated by
                              the L7 proxy.  For egress policy this specifies the server-side TLS
                              parameters to be applied on the connections originated from the local
                              endpoint and terminated by the L7 proxy. For ingress policy this specifies
                              the server-side TLS parameters to be applied on the connections
                              originated from a remote source and terminated by the L7 proxy.
                            properties:
                              certificate:
                                description: |-
                                  Certificate is the file name or k8s secret item name for the certificate
                                  chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                  item must exist.
                                type: string
                              privateKey:
                                description: |-
                                  PrivateKey is the file name or k8s secret item name for the private key
                                  matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                  exists. If given, the item must exist.
                                type: string
                              secret:
                                description: |-
                                  Secret is the secret that contains the certificates and private key for
                                  the TLS context.
                                  By default, Cilium will search in this secret for the following items:
                                    - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                    - 'tls.crt' - Which represents the public key certificate.
                                    - 'tls.key' - Which represents the private key matching the public key
                                                  certificate.
                                properties:
                                  name:
                                    description: Name is the name of the secret.
                                    type: string
                                  namespace:
                                    description: |-
                                      Namespace is the namespace in which the secret exists. Context of use
                                      determines the default value if left out (e.g., "default").
                                    type: string
                                required:
                                - name
                                type: object
                              trustedCA:
                                description: |-
                                  TrustedCA is the file name or k8s secret item name for the trusted CA.
                                  If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                  exist.
                                type: string
                            required:
                            - secret
                            type: object
                        type: object
                      type: array
                  type: object
                type: array
              ingressDeny:
                description: |-
                  IngressDeny is a list of IngressDenyRule which are enforced at ingress.
                  Any rule inserted here will be denied regardless of the allowed ingress
                  rules in the 'ingress' field.
                  If omitted or empty, this rule does not apply at ingress.
                items:
                  description: |-
                    IngressDenyRule contains all rule types which can be applied at ingress,
                    i.e. network traffic that originates outside of the endpoint and
                    is entering the endpoint selected by the endpointSelector.

                      - All members of this structure are optional. If omitted or empty, the
                        member will have no effect on the rule.

                      - If multiple members are set, all of them need to match in order for
                        the rule to take effect. The exception to this rule is FromRequires field;
                        the effects of any Requires field in any rule will apply to all other
                        rules as well.

                      - FromEndpoints, FromCIDR, FromCIDRSet, FromGroups and FromEntities are mutually
                        exclusive. Only one of these members may be present within an individual
                        rule.
                  properties:
                    fromCIDR:
                      description: |-
                        FromCIDR is a list of IP blocks which the endpoint subject to the
                        rule is allowed to receive connections from. Only connections which
                        do *not* originate from the cluster or from the local host are subject
                        to CIDR rules. In order to allow in-cluster connectivity, use the
                        FromEndpoints field.  This will match on the source IP address of
                        incoming connections. Adding  a prefix into FromCIDR or into
                        FromCIDRSet with no ExcludeCIDRs is  equivalent.  Overlaps are
                        allowed between FromCIDR and FromCIDRSet.

                        Example:
                        Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                        connections from 10.3.9.1
                      items:
                        description: |-
                          CIDR specifies a block of IP addresses.
                          Example: 192.0.2.1/32
                        format: cidr
                        type: string
                      type: array
                    fromCIDRSet:
                      description: |-
                        FromCIDRSet is a list of IP blocks which the endpoint subject to the
                        rule is allowed to receive connections from in addition to FromEndpoints,
                        along with a list of subnets contained within their corresponding IP block
                        from which traffic should not be allowed.
                        This will match on the source IP address of incoming connections. Adding
                        a prefix into FromCIDR or into FromCIDRSet with no ExcludeCIDRs is
                        equivalent. Overlaps are allowed between FromCIDR and FromCIDRSet.

                        Example:
                        Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                        connections from 10.0.0.0/8 except from IPs in subnet 10.96.0.0/12.
                      items:
                        description: |-
                          CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                          communication  is allowed, along with an optional list of subnets within that
                          CIDR prefix to/from which outside communication is not allowed.
                        oneOf:
                        - properties:
                            cidr: {}
                          required:
                          - cidr
                        - properties:
                            cidrGroupRef: {}
                          required:
                          - cidrGroupRef
                        - properties:
                            cidrGroupSelector: {}
                          required:
                          - cidrGroupSelector
                        properties:
                          cidr:
                            description: CIDR is a CIDR prefix / IP Block.
                            format: cidr
                            type: string
                          cidrGroupRef:
                            description: |-
                              CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                              A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                              the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                              connections from.
                            maxLength: 253
                            pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                            type: string
                          cidrGroupSelector:
                            description: |-
                              CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                              rather than by name.
                            properties:
                              matchExpressions:
                                description: matchExpressions is a list of label
                                  selector requirements. The requirements are ANDed.
                                items:
                                  description: |-
                                    A label selector requirement is a selector that contains values, a key, and an operator that
                                    relates the key and values.
                                  properties:
                                    key:
                                      description: key is the label key that the
                                        selector applies to.
                                      type: string
                                    operator:
                                      description: |-
                                        operator represents a key's relationship to a set of values.
                                        Valid operators are In, NotIn, Exists and DoesNotExist.
                                      enum:
                                      - In
                                      - NotIn
                                      - Exists
                                      - DoesNotExist
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
                                  description: MatchLabelsValue represents the value
                                    from the MatchLabels {key,value} pair.
                                  maxLength: 63
                                  pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                  type: string
                                description: |-
                                  matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                  map is equivalent to an element of matchExpressions, whose key field is "key", the
                                  operator is "In", and the values array contains only "value". The requirements are ANDed.
                                type: object
                            type: object
                            x-kubernetes-map-type: atomic
                          except:
                            description: |-
                              ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                              is not allowed to initiate connections to. These CIDR prefixes should be
                              contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                              supported yet.
                              These exceptions are only applied to the Cidr in this CIDRRule, and do not
                              apply to any other CIDR prefixes in any other CIDRRules.
                            items:
                              description: |-
                                CIDR specifies a block of IP addresses.
                                Example: 192.0.2.1/32
                              format: cidr
                              type: string
                            type: array
                        type: object
                      type: array
                    fromEndpoints:
                      description: |-
                        FromEndpoints is a list of endpoints identified by an
                        EndpointSelector which are allowed to communicate with the endpoint
                        subject to the rule.

                        Example:
                        Any endpoint with the label "role=backend" can be consumed by any
                        endpoint carrying the label "role=frontend".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    fromEntities:
                      description: |-
                        FromEntities is a list of special entities which the endpoint subject
                        to the rule is allowed to receive connections from. Supported entities are
                        `world`, `cluster` and `host`
                      items:
                        description: |-
                          Entity specifies the class of receiver/sender endpoints that do not have
                          individual identities.  Entities are used to describe "outside of cluster",
                          "host", etc.
                        enum:
                        - all
                        - world
                        - cluster
                        - host
                        - init
                        - ingress
                        - unmanaged
                        - remote-node
                        - health
                        - none
                        - kube-apiserver
                        type: string
                      type: array
                    fromGroups:
                      description: |-
                        FromGroups is a directive that allows the integration with multiple outside
                        providers. Currently, only AWS is supported, and the rule can select by
                        multiple sub directives:

                        Example:
                        FromGroups:
                        - aws:
                            securityGroupsIds:
                            - 'sg-XXXXXXXXXXXXX'
                      items:
                        description: |-
                          Groups structure to store all kinds of new integrations that needs a new
                          derivative policy.
                        properties:
                          aws:
                            description: AWSGroup is an structure that can be used
                              to whitelisting information from AWS integration
                            properties:
                              labels:
                                additionalProperties:
                                  type: string
                                type: object
                              region:
                                type: string
                              securityGroupsIds:
                                items:
                                  type: string
                                type: array
                              securityGroupsNames:
                                items:
                                  type: string
                                type: array
                            type: object
                        type: object
                      type: array
                    fromNodes:
                      description: |-
                        FromNodes is a list of nodes identified by an
                        EndpointSelector which are allowed to communicate with the endpoint
                        subject to the rule.
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    fromRequires:
                      description: |-
                        FromRequires is a list of additional constraints which must be met
                        in order for the selected endpoints to be reachable. These
                        additional constraints do no by itself grant access privileges and
                        must always be accompanied with at least one matching FromEndpoints.

                        Example:
                        Any Endpoint with the label "team=A" requires consuming endpoint
                        to also carry the label "team=A".
                      items:
                        description: EndpointSelector is a wrapper for k8s LabelSelector.
                        properties:
                          matchExpressions:
                            description: matchExpressions is a list of label selector
                              requirements. The requirements are ANDed.
                            items:
                              description: |-
                                A label selector requirement is a selector that contains values, a key, and an operator that
                                relates the key and values.
                              properties:
                                key:
                                  description: key is the label key that the selector
                                    applies to.
                                  type: string
                                operator:
                                  description: |-
                                    operator represents a key's relationship to a set of values.
                                    Valid operators are In, NotIn, Exists and DoesNotExist.
                                  enum:
                                  - In
                                  - NotIn
                                  - Exists
                                  - DoesNotExist
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
                              description: MatchLabelsValue represents the value
                                from the MatchLabels {key,value} pair.
                              maxLength: 63
                              pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                              type: string
                            description: |-
                              matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                              map is equivalent to an element of matchExpressions, whose key field is "key", the
                              operator is "In", and the values array contains only "value". The requirements are ANDed.
                            type: object
                        type: object
                        x-kubernetes-map-type: atomic
                      type: array
                    icmps:
                      description: |-
                        ICMPs is a list of ICMP rule identified by type number
                        which the endpoint subject to the rule is not allowed to
                        receive connections on.

                        Example:
                        Any endpoint with the label "app=httpd" can not accept incoming
                        type 8 ICMP connections.
                      items:
                        description: ICMPRule is a list of ICMP fields.
                        properties:
                          fields:
                            description: Fields is a list of ICMP fields.
                            items:
                              description: ICMPField is a ICMP field.
                              properties:
                                family:
                                  default: IPv4
                                  description: |-
                                    Family is a IP address version.
                                    Currently, we support `IPv4` and `IPv6`.
                                    `IPv4` is set as default.
                                  enum:
                                  - IPv4
                                  - IPv6
                                  type: string
                                type:
                                  anyOf:
                                  - type: integer
                                  - type: string
                                  description: "Type is a ICMP-type.\nIt should
                                    be an 8bit code (0-255), or it's CamelCase name
                                    (for example, \"EchoReply\").\nAllowed ICMP
                                    types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                    | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                    | RouterSelection | TimeExceeded | ParameterProblem
                                    |\n\t\t\t Timestamp | TimestampReply | Photuris
                                    | ExtendedEcho Request | ExtendedEcho Reply\n
                                    \   Ipv6: DestinationUnreachable | PacketTooBig
                                    | TimeExceeded | ParameterProblem |\n\t\t\t
                                    EchoRequest | EchoReply | MulticastListenerQuery|
                                    MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                    | RouterSolicitation | RouterAdvertisement |
                                    NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                    | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                    |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                    | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                    HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                    | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                    | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                    |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                  pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                    Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                  x-kubernetes-int-or-string: true
                              required:
                              - type
                              type: object
                            maxItems: 40
                            type: array
                        type: object
                      type: array
                    toPorts:
                      description: |-
                        ToPorts is a list of destination ports identified by port number and
                        protocol which the endpoint subject to the rule is not allowed to
                        receive connections on.

                        Example:
                        Any endpoint with the label "app=httpd" can not accept incoming
                        connections on port 80/tcp.
                      items:
                        description: |-
                          PortDenyRule is a list of ports/protocol that should be used for deny
                          policies. This structure lacks the L7Rules since it's not supported in deny
                          policies.
                        properties:
                          ports:
                            description: Ports is a list of L4 port/protocol
                            items:
                              description: PortProtocol specifies an L4 port with
                                an optional transport protocol
                              properties:
                                endPort:
                                  description: EndPort can only be an L4 port number.
                                  format: int32
                                  maximum: 65535
                                  minimum: 0
                                  type: integer
                                port:
                                  description: |-
                                    Port can be an L4 port number, or a name in the form of "http"
                                    or "http-8080".
                                  pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                  type: string
                                protocol:
                                  description: |-
                                    Protocol is the L4 protocol. If omitted or empty, any protocol
                                    matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                    Matching on ICMP is not supported.

                                    Named port specified for a container may narrow this down, but may not
                                    contradict this.
                                  enum:
                                  - TCP
                                  - UDP
                                  - SCTP
                                  - ANY
                                  type: string
                              required:
                              - port
                              type: object
                            type: array
                        type: object
                      type: array
                  type: object
                type: array
              labels:
                description: |-
                  Labels is a list of optional strings which can be used to
                  re-identify the rule or to store metadata. It is possible to lookup
                  or delete strings based on labels. Labels are not required to be
                  unique, multiple rules can have overlapping or identical labels.
                items:
                  description: Label is the Cilium's representation of a container
                    label.
                  properties:
                    key:
                      type: string
                    source:
                      description: 'Source can be one of the above values (e.g.:
                        LabelSourceContainer).'
                      type: string
                    value:
                      type: string
                  required:
                  - key
                  type: object
                type: array
              nodeSelector:
                description: |-
                  NodeSelector selects all nodes which should be subject to this rule.
                  EndpointSelector and NodeSelector cannot be both empty and are mutually
                  exclusive. Can only be used in CiliumClusterwideNetworkPolicies.
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
                          enum:
                          - In
                          - NotIn
                          - Exists
                          - DoesNotExist
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
                      description: MatchLabelsValue represents the value from the
                        MatchLabels {key,value} pair.
                      maxLength: 63
                      pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                      type: string
                    description: |-
                      matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                      map is equivalent to an element of matchExpressions, whose key field is "key", the
                      operator is "In", and the values array contains only "value". The requirements are ANDed.
                    type: object
                type: object
                x-kubernetes-map-type: atomic
            type: object
          specs:
            description: Specs is a list of desired Cilium specific rule specification.
            items:
              anyOf:
              - properties:
                  ingress: {}
                required:
                - ingress
              - properties:
                  ingressDeny: {}
                required:
                - ingressDeny
              - properties:
                  egress: {}
                required:
                - egress
              - properties:
                  egressDeny: {}
                required:
                - egressDeny
              description: |-
                Rule is a policy rule which must be applied to all endpoints which match the
                labels contained in the endpointSelector

                Each rule is split into an ingress section which contains all rules
                applicable at ingress, and an egress section applicable at egress. For rule
                types such as `L4Rule` and `CIDR` which can be applied at both ingress and
                egress, both ingress and egress side have to either specifically allow the
                connection or one side has to be omitted.

                Either ingress, egress, or both can be provided. If both ingress and egress
                are omitted, the rule has no effect.
              oneOf:
              - properties:
                  endpointSelector: {}
                required:
                - endpointSelector
              - properties:
                  nodeSelector: {}
                required:
                - nodeSelector
              properties:
                description:
                  description: |-
                    Description is a free form string, it can be used by the creator of
                    the rule to store human readable explanation of the purpose of this
                    rule. Rules cannot be identified by comment.
                  type: string
                egress:
                  description: |-
                    Egress is a list of EgressRule which are enforced at egress.
                    If omitted or empty, this rule does not apply at egress.
                  items:
                    description: |-
                      EgressRule contains all rule types which can be applied at egress, i.e.
                      network traffic that originates inside the endpoint and exits the endpoint
                      selected by the endpointSelector.

                        - All members of this structure are optional. If omitted or empty, the
                          member will have no effect on the rule.

                        - If multiple members of the structure are specified, then all members
                          must match in order for the rule to take effect. The exception to this
                          rule is the ToRequires member; the effects of any Requires field in any
                          rule will apply to all other rules as well.

                        - ToEndpoints, ToCIDR, ToCIDRSet, ToEntities, ToServices and ToGroups are
                          mutually exclusive. Only one of these members may be present within an
                          individual rule.
                    properties:
                      authentication:
                        description: Authentication is the required authentication
                          type for the allowed traffic, if any.
                        properties:
                          mode:
                            description: Mode is the required authentication mode
                              for the allowed traffic, if any.
                            enum:
                            - disabled
                            - required
                            - test-always-fail
                            type: string
                        required:
                        - mode
                        type: object
                      icmps:
                        description: |-
                          ICMPs is a list of ICMP rule identified by type number
                          which the endpoint subject to the rule is allowed to connect to.

                          Example:
                          Any endpoint with the label "app=httpd" is allowed to initiate
                          type 8 ICMP connections.
                        items:
                          description: ICMPRule is a list of ICMP fields.
                          properties:
                            fields:
                              description: Fields is a list of ICMP fields.
                              items:
                                description: ICMPField is a ICMP field.
                                properties:
                                  family:
                                    default: IPv4
                                    description: |-
                                      Family is a IP address version.
                                      Currently, we support `IPv4` and `IPv6`.
                                      `IPv4` is set as default.
                                    enum:
                                    - IPv4
                                    - IPv6
                                    type: string
                                  type:
                                    anyOf:
                                    - type: integer
                                    - type: string
                                    description: "Type is a ICMP-type.\nIt should
                                      be an 8bit code (0-255), or it's CamelCase
                                      name (for example, \"EchoReply\").\nAllowed
                                      ICMP types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                      | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                      | RouterSelection | TimeExceeded | ParameterProblem
                                      |\n\t\t\t Timestamp | TimestampReply | Photuris
                                      | ExtendedEcho Request | ExtendedEcho Reply\n
                                      \   Ipv6: DestinationUnreachable | PacketTooBig
                                      | TimeExceeded | ParameterProblem |\n\t\t\t
                                      EchoRequest | EchoReply | MulticastListenerQuery|
                                      MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                      | RouterSolicitation | RouterAdvertisement
                                      | NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                      | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                      |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                      | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                      HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                      | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                      | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                      |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                    pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                      Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                    x-kubernetes-int-or-string: true
                                required:
                                - type
                                type: object
                              maxItems: 40
                              type: array
                          type: object
                        type: array
                      toCIDR:
                        description: |-
                          ToCIDR is a list of IP blocks which the endpoint subject to the rule
                          is allowed to initiate connections. Only connections destined for
                          outside of the cluster and not targeting the host will be subject
                          to CIDR rules.  This will match on the destination IP address of
                          outgoing connections. Adding a prefix into ToCIDR or into ToCIDRSet
                          with no ExcludeCIDRs is equivalent. Overlaps are allowed between
                          ToCIDR and ToCIDRSet.

                          Example:
                          Any endpoint with the label "app=database-proxy" is allowed to
                          initiate connections to 10.2.3.0/24
                        items:
                          description: |-
                            CIDR specifies a block of IP addresses.
                            Example: 192.0.2.1/32
                          format: cidr
                          type: string
                        type: array
                      toCIDRSet:
                        description: |-
                          ToCIDRSet is a list of IP blocks which the endpoint subject to the rule
                          is allowed to initiate connections to in addition to connections
                          which are allowed via ToEndpoints, along with a list of subnets contained
                          within their corresponding IP block to which traffic should not be
                          allowed. This will match on the destination IP address of outgoing
                          connections. Adding a prefix into ToCIDR or into ToCIDRSet with no
                          ExcludeCIDRs is equivalent. Overlaps are allowed between ToCIDR and
                          ToCIDRSet.

                          Example:
                          Any endpoint with the label "app=database-proxy" is allowed to
                          initiate connections to 10.2.3.0/24 except from IPs in subnet 10.2.3.0/28.
                        items:
                          description: |-
                            CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                            communication  is allowed, along with an optional list of subnets within that
                            CIDR prefix to/from which outside communication is not allowed.
                          oneOf:
                          - properties:
                              cidr: {}
                            required:
                            - cidr
                          - properties:
                              cidrGroupRef: {}
                            required:
                            - cidrGroupRef
                          - properties:
                              cidrGroupSelector: {}
                            required:
                            - cidrGroupSelector
                          properties:
                            cidr:
                              description: CIDR is a CIDR prefix / IP Block.
                              format: cidr
                              type: string
                            cidrGroupRef:
                              description: |-
                                CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                                A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                                the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                                connections from.
                              maxLength: 253
                              pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                              type: string
                            cidrGroupSelector:
                              description: |-
                                CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                                rather than by name.
                              properties:
                                matchExpressions:
                                  description: matchExpressions is a list of label
                                    selector requirements. The requirements are
                                    ANDed.
                                  items:
                                    description: |-
                                      A label selector requirement is a selector that contains values, a key, and an operator that
                                      relates the key and values.
                                    properties:
                                      key:
                                        description: key is the label key that the
                                          selector applies to.
                                        type: string
                                      operator:
                                        description: |-
                                          operator represents a key's relationship to a set of values.
                                          Valid operators are In, NotIn, Exists and DoesNotExist.
                                        enum:
                                        - In
                                        - NotIn
                                        - Exists
                                        - DoesNotExist
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
                                    description: MatchLabelsValue represents the
                                      value from the MatchLabels {key,value} pair.
                                    maxLength: 63
                                    pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                    type: string
                                  description: |-
                                    matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                    map is equivalent to an element of matchExpressions, whose key field is "key", the
                                    operator is "In", and the values array contains only "value". The requirements are ANDed.
                                  type: object
                              type: object
                              x-kubernetes-map-type: atomic
                            except:
                              description: |-
                                ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                                is not allowed to initiate connections to. These CIDR prefixes should be
                                contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                                supported yet.
                                These exceptions are only applied to the Cidr in this CIDRRule, and do not
                                apply to any other CIDR prefixes in any other CIDRRules.
                              items:
                                description: |-
                                  CIDR specifies a block of IP addresses.
                                  Example: 192.0.2.1/32
                                format: cidr
                                type: string
                              type: array
                          type: object
                        type: array
                      toEndpoints:
                        description: |-
                          ToEndpoints is a list of endpoints identified by an EndpointSelector to
                          which the endpoints subject to the rule are allowed to communicate.

                          Example:
                          Any endpoint with the label "role=frontend" can communicate with any
                          endpoint carrying the label "role=backend".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      toEntities:
                        description: |-
                          ToEntities is a list of special entities to which the endpoint subject
                          to the rule is allowed to initiate connections. Supported entities are
                          `world`, `cluster`,`host`,`remote-node`,`kube-apiserver`, `init`,
                          `health`,`unmanaged` and `all`.
                        items:
                          description: |-
                            Entity specifies the class of receiver/sender endpoints that do not have
                            individual identities.  Entities are used to describe "outside of cluster",
                            "host", etc.
                          enum:
                          - all
                          - world
                          - cluster
                          - host
                          - init
                          - ingress
                          - unmanaged
                          - remote-node
                          - health
                          - none
                          - kube-apiserver
                          type: string
                        type: array
                      toFQDNs:
                        description: |-
                          ToFQDN allows whitelisting DNS names in place of IPs. The IPs that result
                          from DNS resolution of `ToFQDN.MatchName`s are added to the same
                          EgressRule object as ToCIDRSet entries, and behave accordingly. Any L4 and
                          L7 rules within this EgressRule will also apply to these IPs.
                          The DNS -> IP mapping is re-resolved periodically from within the
                          cilium-agent, and the IPs in the DNS response are effected in the policy
                          for selected pods as-is (i.e. the list of IPs is not modified in any way).
                          Note: An explicit rule to allow for DNS traffic is needed for the pods, as
                          ToFQDN counts as an egress rule and will enforce egress policy when
                          PolicyEnforcment=default.
                          Note: If the resolved IPs are IPs within the kubernetes cluster, the
                          ToFQDN rule will not apply to that IP.
                          Note: ToFQDN cannot occur in the same policy as other To* rules.
                        items:
                          oneOf:
                          - properties:
                              matchName: {}
                            required:
                            - matchName
                          - properties:
                              matchPattern: {}
                            required:
                            - matchPattern
                          properties:
                            matchName:
                              description: |-
                                MatchName matches literal DNS names. A trailing "." is automatically added
                                when missing.
                              maxLength: 255
                              pattern: ^([-a-zA-Z0-9_]+[.]?)+$
                              type: string
                            matchPattern:
                              description: |-
                                MatchPattern allows using wildcards to match DNS names. All wildcards are
                                case insensitive. The wildcards are:
                                - "*" matches 0 or more DNS valid characters, and may occur anywhere in
                                the pattern. As a special case a "*" as the leftmost character, without a
                                following "." matches all subdomains as well as the name to the right.
                                A trailing "." is automatically added when missing.

                                Examples:
                                `*.cilium.io` matches subomains of cilium at that level
                                  www.cilium.io and blog.cilium.io match, cilium.io and google.com do not
                                `*cilium.io` matches cilium.io and all subdomains ends with "cilium.io"
                                  except those containing "." separator, subcilium.io and sub-cilium.io match,
                                  www.cilium.io and blog.cilium.io does not
                                sub*.cilium.io matches subdomains of cilium where the subdomain component
                                begins with "sub"
                                  sub.cilium.io and subdomain.cilium.io match, www.cilium.io,
                                  blog.cilium.io, cilium.io and google.com do not
                              maxLength: 255
                              pattern: ^([-a-zA-Z0-9_*]+[.]?)+$
                              type: string
                          type: object
                        type: array
                      toGroups:
                        description: |-
                          ToGroups is a directive that allows the integration with multiple outside
                          providers. Currently, only AWS is supported, and the rule can select by
                          multiple sub directives:

                          Example:
                          toGroups:
                          - aws:
                              securityGroupsIds:
                              - 'sg-XXXXXXXXXXXXX'
                        items:
                          description: |-
                            Groups structure to store all kinds of new integrations that needs a new
                            derivative policy.
                          properties:
                            aws:
                              description: AWSGroup is an structure that can be
                                used to whitelisting information from AWS integration
                              properties:
                                labels:
                                  additionalProperties:
                                    type: string
                                  type: object
                                region:
                                  type: string
                                securityGroupsIds:
                                  items:
                                    type: string
                                  type: array
                                securityGroupsNames:
                                  items:
                                    type: string
                                  type: array
                              type: object
                          type: object
                        type: array
                      toNodes:
                        description: |-
                          ToNodes is a list of nodes identified by an
                          EndpointSelector to which endpoints subject to the rule is allowed to communicate.
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      toPorts:
                        description: |-
                          ToPorts is a list of destination ports identified by port number and
                          protocol which the endpoint subject to the rule is allowed to
                          connect to.

                          Example:
                          Any endpoint with the label "role=frontend" is allowed to initiate
                          connections to destination port 8080/tcp
                        items:
                          description: |-
                            PortRule is a list of ports/protocol combinations with optional Layer 7
                            rules which must be met.
                          properties:
                            listener:
                              description: |-
                                listener specifies the name of a custom Envoy listener to which this traffic should be
                                redirected to.
                              properties:
                                envoyConfig:
                                  description: |-
                                    EnvoyConfig is a reference to the CEC or CCEC resource in which
                                    the listener is defined.
                                  properties:
                                    kind:
                                      description: |-
                                        Kind is the resource type being referred to. Defaults to CiliumEnvoyConfig or
                                        CiliumClusterwideEnvoyConfig for CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy,
                                        respectively. The only case this is currently explicitly needed is when referring to a
                                        CiliumClusterwideEnvoyConfig from CiliumNetworkPolicy, as using a namespaced listener
                                        from a cluster scoped policy is not allowed.
                                      enum:
                                      - CiliumEnvoyConfig
                                      - CiliumClusterwideEnvoyConfig
                                      type: string
                                    name:
                                      description: |-
                                        Name is the resource name of the CiliumEnvoyConfig or CiliumClusterwideEnvoyConfig where
                                        the listener is defined in.
                                      minLength: 1
                                      type: string
                                  required:
                                  - name
                                  type: object
                                name:
                                  description: Name is the name of the listener.
                                  minLength: 1
                                  type: string
                                priority:
                                  description: |-
                                    Priority for this Listener that is used when multiple rules would apply different
                                    listeners to a policy map entry. Behavior of this is implementation dependent.
                                  maximum: 100
                                  minimum: 1
                                  type: integer
                              required:
                              - envoyConfig
                              - name
                              type: object
                            originatingTLS:
                              description: |-
                                OriginatingTLS is the TLS context for the connections originated by
                                the L7 proxy.  For egress policy this specifies the client-side TLS
                                parameters for the upstream connection originating from the L7 proxy
                                to the remote destination. For ingress policy this specifies the
                                client-side TLS parameters for the connection from the L7 proxy to
                                the local endpoint.
                              properties:
                                certificate:
                                  description: |-
                                    Certificate is the file name or k8s secret item name for the certificate
                                    chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                    item must exist.
                                  type: string
                                privateKey:
                                  description: |-
                                    PrivateKey is the file name or k8s secret item name for the private key
                                    matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                    exists. If given, the item must exist.
                                  type: string
                                secret:
                                  description: |-
                                    Secret is the secret that contains the certificates and private key for
                                    the TLS context.
                                    By default, Cilium will search in this secret for the following items:
                                      - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                      - 'tls.crt' - Which represents the public key certificate.
                                      - 'tls.key' - Which represents the private key matching the public key
                                                    certificate.
                                  properties:
                                    name:
                                      description: Name is the name of the secret.
                                      type: string
                                    namespace:
                                      description: |-
                                        Namespace is the namespace in which the secret exists. Context of use
                                        determines the default value if left out (e.g., "default").
                                      type: string
                                  required:
                                  - name
                                  type: object
                                trustedCA:
                                  description: |-
                                    TrustedCA is the file name or k8s secret item name for the trusted CA.
                                    If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                    exist.
                                  type: string
                              required:
                              - secret
                              type: object
                            ports:
                              description: Ports is a list of L4 port/protocol
                              items:
                                description: PortProtocol specifies an L4 port with
                                  an optional transport protocol
                                properties:
                                  endPort:
                                    description: EndPort can only be an L4 port
                                      number.
                                    format: int32
                                    maximum: 65535
                                    minimum: 0
                                    type: integer
                                  port:
                                    description: |-
                                      Port can be an L4 port number, or a name in the form of "http"
                                      or "http-8080".
                                    pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                    type: string
                                  protocol:
                                    description: |-
                                      Protocol is the L4 protocol. If omitted or empty, any protocol
                                      matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                      Matching on ICMP is not supported.

                                      Named port specified for a container may narrow this down, but may not
                                      contradict this.
                                    enum:
                                    - TCP
                                    - UDP
                                    - SCTP
                                    - ANY
                                    type: string
                                required:
                                - port
                                type: object
                              maxItems: 40
                              type: array
                            rules:
                              description: |-
                                Rules is a list of additional port level rules which must be met in
                                order for the PortRule to allow the traffic. If omitted or empty,
                                no layer 7 rules are enforced.
                              oneOf:
                              - properties:
                                  http: {}
                                required:
                                - http
                              - properties:
                                  kafka: {}
                                required:
                                - kafka
                              - properties:
                                  dns: {}
                                required:
                                - dns
                              - properties:
                                  l7proto: {}
                                required:
                                - l7proto
                              properties:
                                dns:
                                  description: DNS-specific rules.
                                  items:
                                    description: PortRuleDNS is a list of allowed
                                      DNS lookups.
                                    oneOf:
                                    - properties:
                                        matchName: {}
                                      required:
                                      - matchName
                                    - properties:
                                        matchPattern: {}
                                      required:
                                      - matchPattern
                                    properties:
                                      matchName:
                                        description: |-
                                          MatchName matches literal DNS names. A trailing "." is automatically added
                                          when missing.
                                        maxLength: 255
                                        pattern: ^([-a-zA-Z0-9_]+[.]?)+$
                                        type: string
                                      matchPattern:
                                        description: |-
                                          MatchPattern allows using wildcards to match DNS names. All wildcards are
                                          case insensitive. The wildcards are:
                                          - "*" matches 0 or more DNS valid characters, and may occur anywhere in
                                          the pattern. As a special case a "*" as the leftmost character, without a
                                          following "." matches all subdomains as well as the name to the right.
                                          A trailing "." is automatically added when missing.

                                          Examples:
                                          `*.cilium.io` matches subomains of cilium at that level
                                            www.cilium.io and blog.cilium.io match, cilium.io and google.com do not
                                          `*cilium.io` matches cilium.io and all subdomains ends with "cilium.io"
                                            except those containing "." separator, subcilium.io and sub-cilium.io match,
                                            www.cilium.io and blog.cilium.io does not
                                          sub*.cilium.io matches subdomains of cilium where the subdomain component
                                          begins with "sub"
                                            sub.cilium.io and subdomain.cilium.io match, www.cilium.io,
                                            blog.cilium.io, cilium.io and google.com do not
                                        maxLength: 255
                                        pattern: ^([-a-zA-Z0-9_*]+[.]?)+$
                                        type: string
                                    type: object
                                  type: array
                                http:
                                  description: HTTP specific rules.
                                  items:
                                    description: |-
                                      PortRuleHTTP is a list of HTTP protocol constraints. All fields are
                                      optional, if all fields are empty or missing, the rule does not have any
                                      effect.

                                      All fields of this type are extended POSIX regex as defined by IEEE Std
                                      1003.1, (i.e this follows the egrep/unix syntax, not the perl syntax)
                                      matched against the path of an incoming request. Currently it can contain
                                      characters disallowed from the conventional "path" part of a URL as defined
                                      by RFC 3986.
                                    properties:
                                      headerMatches:
                                        description: |-
                                          HeaderMatches is a list of HTTP headers which must be
                                          present and match against the given values. Mismatch field can be used
                                          to specify what to do when there is no match.
                                        items:
                                          description: |-
                                            HeaderMatch extends the HeaderValue for matching requirement of a
                                            named header field against an immediate string, a secret value, or
                                            a regex.  If none of the optional fields is present, then the
                                            header value is not matched, only presence of the header is enough.
                                          properties:
                                            mismatch:
                                              description: |-
                                                Mismatch identifies what to do in case there is no match. The default is
                                                to drop the request. Otherwise the overall rule is still considered as
                                                matching, but the mismatches are logged in the access log.
                                              enum:
                                              - LOG
                                              - ADD
                                              - DELETE
                                              - REPLACE
                                              type: string
                                            name:
                                              description: Name identifies the header.
                                              minLength: 1
                                              type: string
                                            secret:
                                              description: |-
                                                Secret refers to a secret that contains the value to be matched against.
                                                The secret must only contain one entry. If the referred secret does not
                                                exist, and there is no "Value" specified, the match will fail.
                                              properties:
                                                name:
                                                  description: Name is the name
                                                    of the secret.
                                                  type: string
                                                namespace:
                                                  description: |-
                                                    Namespace is the namespace in which the secret exists. Context of use
                                                    determines the default value if left out (e.g., "default").
                                                  type: string
                                              required:
                                              - name
                                              type: object
                                            value:
                                              description: |-
                                                Value matches the exact value of the header. Can be specified either
                                                alone or together with "Secret"; will be used as the header value if the
                                                secret can not be found in the latter case.
                                              type: string
                                          required:
                                          - name
                                          type: object
                                        type: array
                                      headers:
                                        description: |-
                                          Headers is a list of HTTP headers which must be present in the
                                          request. If omitted or empty, requests are allowed regardless of
                                          headers present.
                                        items:
                                          type: string
                                        type: array
                                      host:
                                        description: |-
                                          Host is an extended POSIX regex matched against the host header of a
                                          request. Examples:

                                          - foo.bar.com will match the host fooXbar.com or foo-bar.com
                                          - foo\.bar\.com will only match the host foo.bar.com

                                          If omitted or empty, the value of the host header is ignored.
                                        format: idn-hostname
                                        type: string
                                      method:
                                        description: |-
                                          Method is an extended POSIX regex matched against the method of a
                                          request, e.g. "GET", "POST", "PUT", "PATCH", "DELETE", ...

                                          If omitted or empty, all methods are allowed.
                                        type: string
                                      path:
                                        description: |-
                                          Path is an extended POSIX regex matched against the path of a
                                          request. Currently it can contain characters disallowed from the
                                          conventional "path" part of a URL as defined by RFC 3986.

                                          If omitted or empty, all paths are all allowed.
                                        type: string
                                    type: object
                                  type: array
                                kafka:
                                  description: Kafka-specific rules.
                                  items:
                                    description: |-
                                      PortRule is a list of Kafka protocol constraints. All fields are
                                      optional, if all fields are empty or missing, the rule will match all
                                      Kafka messages.
                                    properties:
                                      apiKey:
                                        description: |-
                                          APIKey is a case-insensitive string matched against the key of a
                                          request, e.g. "produce", "fetch", "createtopic", "deletetopic", et al
                                          Reference: https://kafka.apache.org/protocol#protocol_api_keys

                                          If omitted or empty, and if Role is not specified, then all keys are allowed.
                                        type: string
                                      apiVersion:
                                        description: |-
                                          APIVersion is the version matched against the api version of the
                                          Kafka message. If set, it has to be a string representing a positive
                                          integer.

                                          If omitted or empty, all versions are allowed.
                                        type: string
                                      clientID:
                                        description: |-
                                          ClientID is the client identifier as provided in the request.

                                          From Kafka protocol documentation:
                                          This is a user supplied identifier for the client application. The
                                          user can use any identifier they like and it will be used when
                                          logging errors, monitoring aggregates, etc. For example, one might
                                          want to monitor not just the requests per second overall, but the
                                          number coming from each client application (each of which could
                                          reside on multiple servers). This id acts as a logical grouping
                                          across all requests from a particular client.

                                          If omitted or empty, all client identifiers are allowed.
                                        type: string
                                      role:
                                        description: |-
                                          Role is a case-insensitive string and describes a group of API keys
                                          necessary to perform certain higher-level Kafka operations such as "produce"
                                          or "consume". A Role automatically expands into all APIKeys required
                                          to perform the specified higher-level operation.

                                          The following values are supported:
                                            - "produce": Allow producing to the topics specified in the rule
                                            - "consume": Allow consuming from the topics specified in the rule

                                          This field is incompatible with the APIKey field, i.e APIKey and Role
                                          cannot both be specified in the same rule.

                                          If omitted or empty, and if APIKey is not specified, then all keys are
                                          allowed.
                                        enum:
                                        - produce
                                        - consume
                                        type: string
                                      topic:
                                        description: |-
                                          Topic is the topic name contained in the message. If a Kafka request
                                          contains multiple topics, then all topics must be allowed or the
                                          message will be rejected.

                                          This constraint is ignored if the matched request message type
                                          doesn't contain any topic. Maximum size of Topic can be 249
                                          characters as per recent Kafka spec and allowed characters are
                                          a-z, A-Z, 0-9, -, . and _.

                                          Older Kafka versions had longer topic lengths of 255, but in Kafka 0.10
                                          version the length was changed from 255 to 249. For compatibility
                                          reasons we are using 255.

                                          If omitted or empty, all topics are allowed.
                                        maxLength: 255
                                        type: string
                                    type: object
                                  type: array
                                l7:
                                  description: Key-value pair rules.
                                  items:
                                    additionalProperties:
                                      type: string
                                    description: |-
                                      PortRuleL7 is a list of key-value pairs interpreted by a L7 protocol as
                                      protocol constraints. All fields are optional, if all fields are empty or
                                      missing, the rule does not have any effect.
                                    type: object
                                  type: array
                                l7proto:
                                  description: Name of the L7 protocol for which
                                    the Key-value pair rules apply.
                                  type: string
                              type: object
                            serverNames:
                              description: |-
                                ServerNames is a list of allowed TLS SNI values. If not empty, then
                                TLS must be present and one of the provided SNIs must be indicated in the
                                TLS handshake.
                              items:
                                type: string
                              type: array
                            terminatingTLS:
                              description: |-
                                TerminatingTLS is the TLS context for the connection terminated by
                                the L7 proxy.  For egress policy this specifies the server-side TLS
                                parameters to be applied on the connections originated from the local
                                endpoint and terminated by the L7 proxy. For ingress policy this specifies
                                the server-side TLS parameters to be applied on the connections
                                originated from a remote source and terminated by the L7 proxy.
                              properties:
                                certificate:
                                  description: |-
                                    Certificate is the file name or k8s secret item name for the certificate
                                    chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                    item must exist.
                                  type: string
                                privateKey:
                                  description: |-
                                    PrivateKey is the file name or k8s secret item name for the private key
                                    matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                    exists. If given, the item must exist.
                                  type: string
                                secret:
                                  description: |-
                                    Secret is the secret that contains the certificates and private key for
                                    the TLS context.
                                    By default, Cilium will search in this secret for the following items:
                                      - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                      - 'tls.crt' - Which represents the public key certificate.
                                      - 'tls.key' - Which represents the private key matching the public key
                                                    certificate.
                                  properties:
                                    name:
                                      description: Name is the name of the secret.
                                      type: string
                                    namespace:
                                      description: |-
                                        Namespace is the namespace in which the secret exists. Context of use
                                        determines the default value if left out (e.g., "default").
                                      type: string
                                  required:
                                  - name
                                  type: object
                                trustedCA:
                                  description: |-
                                    TrustedCA is the file name or k8s secret item name for the trusted CA.
                                    If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                    exist.
                                  type: string
                              required:
                              - secret
                              type: object
                          type: object
                        type: array
                      toRequires:
                        description: |-
                          ToRequires is a list of additional constraints which must be met
                          in order for the selected endpoints to be able to connect to other
                          endpoints. These additional constraints do no by itself grant access
                          privileges and must always be accompanied with at least one matching
                          ToEndpoints.

                          Example:
                          Any Endpoint with the label "team=A" requires any endpoint to which it
                          communicates to also carry the label "team=A".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      toServices:
                        description: |-
                          ToServices is a list of services to which the endpoint subject
                          to the rule is allowed to initiate connections.
                          Currently Cilium only supports toServices for K8s services.
                        items:
                          description: |-
                            Service selects policy targets that are bundled as part of a
                            logical load-balanced service.

                            Currently only Kubernetes-based Services are supported.
                          properties:
                            k8sService:
                              description: K8sService selects service by name and
                                namespace pair
                              properties:
                                namespace:
                                  type: string
                                serviceName:
                                  type: string
                              type: object
                            k8sServiceSelector:
                              description: K8sServiceSelector selects services by
                                k8s labels and namespace
                              properties:
                                namespace:
                                  type: string
                                selector:
                                  description: ServiceSelector is a label selector
                                    for k8s services
                                  properties:
                                    matchExpressions:
                                      description: matchExpressions is a list of
                                        label selector requirements. The requirements
                                        are ANDed.
                                      items:
                                        description: |-
                                          A label selector requirement is a selector that contains values, a key, and an operator that
                                          relates the key and values.
                                        properties:
                                          key:
                                            description: key is the label key that
                                              the selector applies to.
                                            type: string
                                          operator:
                                            description: |-
                                              operator represents a key's relationship to a set of values.
                                              Valid operators are In, NotIn, Exists and DoesNotExist.
                                            enum:
                                            - In
                                            - NotIn
                                            - Exists
                                            - DoesNotExist
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
                                        description: MatchLabelsValue represents
                                          the value from the MatchLabels {key,value}
                                          pair.
                                        maxLength: 63
                                        pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                        type: string
                                      description: |-
                                        matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                        map is equivalent to an element of matchExpressions, whose key field is "key", the
                                        operator is "In", and the values array contains only "value". The requirements are ANDed.
                                      type: object
                                  type: object
                                  x-kubernetes-map-type: atomic
                              required:
                              - selector
                              type: object
                          type: object
                        type: array
                    type: object
                  type: array
                egressDeny:
                  description: |-
                    EgressDeny is a list of EgressDenyRule which are enforced at egress.
                    Any rule inserted here will be denied regardless of the allowed egress
                    rules in the 'egress' field.
                    If omitted or empty, this rule does not apply at egress.
                  items:
                    description: |-
                      EgressDenyRule contains all rule types which can be applied at egress, i.e.
                      network traffic that originates inside the endpoint and exits the endpoint
                      selected by the endpointSelector.

                        - All members of this structure are optional. If omitted or empty, the
                          member will have no effect on the rule.

                        - If multiple members of the structure are specified, then all members
                          must match in order for the rule to take effect. The exception to this
                          rule is the ToRequires member; the effects of any Requires field in any
                          rule will apply to all other rules as well.

                        - ToEndpoints, ToCIDR, ToCIDRSet, ToEntities, ToServices and ToGroups are
                          mutually exclusive. Only one of these members may be present within an
                          individual rule.
                    properties:
                      icmps:
                        description: |-
                          ICMPs is a list of ICMP rule identified by type number
                          which the endpoint subject to the rule is not allowed to connect to.

                          Example:
                          Any endpoint with the label "app=httpd" is not allowed to initiate
                          type 8 ICMP connections.
                        items:
                          description: ICMPRule is a list of ICMP fields.
                          properties:
                            fields:
                              description: Fields is a list of ICMP fields.
                              items:
                                description: ICMPField is a ICMP field.
                                properties:
                                  family:
                                    default: IPv4
                                    description: |-
                                      Family is a IP address version.
                                      Currently, we support `IPv4` and `IPv6`.
                                      `IPv4` is set as default.
                                    enum:
                                    - IPv4
                                    - IPv6
                                    type: string
                                  type:
                                    anyOf:
                                    - type: integer
                                    - type: string
                                    description: "Type is a ICMP-type.\nIt should
                                      be an 8bit code (0-255), or it's CamelCase
                                      name (for example, \"EchoReply\").\nAllowed
                                      ICMP types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                      | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                      | RouterSelection | TimeExceeded | ParameterProblem
                                      |\n\t\t\t Timestamp | TimestampReply | Photuris
                                      | ExtendedEcho Request | ExtendedEcho Reply\n
                                      \   Ipv6: DestinationUnreachable | PacketTooBig
                                      | TimeExceeded | ParameterProblem |\n\t\t\t
                                      EchoRequest | EchoReply | MulticastListenerQuery|
                                      MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                      | RouterSolicitation | RouterAdvertisement
                                      | NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                      | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                      |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                      | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                      HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                      | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                      | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                      |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                    pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                      Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                    x-kubernetes-int-or-string: true
                                required:
                                - type
                                type: object
                              maxItems: 40
                              type: array
                          type: object
                        type: array
                      toCIDR:
                        description: |-
                          ToCIDR is a list of IP blocks which the endpoint subject to the rule
                          is allowed to initiate connections. Only connections destined for
                          outside of the cluster and not targeting the host will be subject
                          to CIDR rules.  This will match on the destination IP address of
                          outgoing connections. Adding a prefix into ToCIDR or into ToCIDRSet
                          with no ExcludeCIDRs is equivalent. Overlaps are allowed between
                          ToCIDR and ToCIDRSet.

                          Example:
                          Any endpoint with the label "app=database-proxy" is allowed to
                          initiate connections to 10.2.3.0/24
                        items:
                          description: |-
                            CIDR specifies a block of IP addresses.
                            Example: 192.0.2.1/32
                          format: cidr
                          type: string
                        type: array
                      toCIDRSet:
                        description: |-
                          ToCIDRSet is a list of IP blocks which the endpoint subject to the rule
                          is allowed to initiate connections to in addition to connections
                          which are allowed via ToEndpoints, along with a list of subnets contained
                          within their corresponding IP block to which traffic should not be
                          allowed. This will match on the destination IP address of outgoing
                          connections. Adding a prefix into ToCIDR or into ToCIDRSet with no
                          ExcludeCIDRs is equivalent. Overlaps are allowed between ToCIDR and
                          ToCIDRSet.

                          Example:
                          Any endpoint with the label "app=database-proxy" is allowed to
                          initiate connections to 10.2.3.0/24 except from IPs in subnet 10.2.3.0/28.
                        items:
                          description: |-
                            CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                            communication  is allowed, along with an optional list of subnets within that
                            CIDR prefix to/from which outside communication is not allowed.
                          oneOf:
                          - properties:
                              cidr: {}
                            required:
                            - cidr
                          - properties:
                              cidrGroupRef: {}
                            required:
                            - cidrGroupRef
                          - properties:
                              cidrGroupSelector: {}
                            required:
                            - cidrGroupSelector
                          properties:
                            cidr:
                              description: CIDR is a CIDR prefix / IP Block.
                              format: cidr
                              type: string
                            cidrGroupRef:
                              description: |-
                                CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                                A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                                the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                                connections from.
                              maxLength: 253
                              pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                              type: string
                            cidrGroupSelector:
                              description: |-
                                CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                                rather than by name.
                              properties:
                                matchExpressions:
                                  description: matchExpressions is a list of label
                                    selector requirements. The requirements are
                                    ANDed.
                                  items:
                                    description: |-
                                      A label selector requirement is a selector that contains values, a key, and an operator that
                                      relates the key and values.
                                    properties:
                                      key:
                                        description: key is the label key that the
                                          selector applies to.
                                        type: string
                                      operator:
                                        description: |-
                                          operator represents a key's relationship to a set of values.
                                          Valid operators are In, NotIn, Exists and DoesNotExist.
                                        enum:
                                        - In
                                        - NotIn
                                        - Exists
                                        - DoesNotExist
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
                                    description: MatchLabelsValue represents the
                                      value from the MatchLabels {key,value} pair.
                                    maxLength: 63
                                    pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                    type: string
                                  description: |-
                                    matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                    map is equivalent to an element of matchExpressions, whose key field is "key", the
                                    operator is "In", and the values array contains only "value". The requirements are ANDed.
                                  type: object
                              type: object
                              x-kubernetes-map-type: atomic
                            except:
                              description: |-
                                ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                                is not allowed to initiate connections to. These CIDR prefixes should be
                                contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                                supported yet.
                                These exceptions are only applied to the Cidr in this CIDRRule, and do not
                                apply to any other CIDR prefixes in any other CIDRRules.
                              items:
                                description: |-
                                  CIDR specifies a block of IP addresses.
                                  Example: 192.0.2.1/32
                                format: cidr
                                type: string
                              type: array
                          type: object
                        type: array
                      toEndpoints:
                        description: |-
                          ToEndpoints is a list of endpoints identified by an EndpointSelector to
                          which the endpoints subject to the rule are allowed to communicate.

                          Example:
                          Any endpoint with the label "role=frontend" can communicate with any
                          endpoint carrying the label "role=backend".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      toEntities:
                        description: |-
                          ToEntities is a list of special entities to which the endpoint subject
                          to the rule is allowed to initiate connections. Supported entities are
                          `world`, `cluster`,`host`,`remote-node`,`kube-apiserver`, `init`,
                          `health`,`unmanaged` and `all`.
                        items:
                          description: |-
                            Entity specifies the class of receiver/sender endpoints that do not have
                            individual identities.  Entities are used to describe "outside of cluster",
                            "host", etc.
                          enum:
                          - all
                          - world
                          - cluster
                          - host
                          - init
                          - ingress
                          - unmanaged
                          - remote-node
                          - health
                          - none
                          - kube-apiserver
                          type: string
                        type: array
                      toGroups:
                        description: |-
                          ToGroups is a directive that allows the integration with multiple outside
                          providers. Currently, only AWS is supported, and the rule can select by
                          multiple sub directives:

                          Example:
                          toGroups:
                          - aws:
                              securityGroupsIds:
                              - 'sg-XXXXXXXXXXXXX'
                        items:
                          description: |-
                            Groups structure to store all kinds of new integrations that needs a new
                            derivative policy.
                          properties:
                            aws:
                              description: AWSGroup is an structure that can be
                                used to whitelisting information from AWS integration
                              properties:
                                labels:
                                  additionalProperties:
                                    type: string
                                  type: object
                                region:
                                  type: string
                                securityGroupsIds:
                                  items:
                                    type: string
                                  type: array
                                securityGroupsNames:
                                  items:
                                    type: string
                                  type: array
                              type: object
                          type: object
                        type: array
                      toNodes:
                        description: |-
                          ToNodes is a list of nodes identified by an
                          EndpointSelector to which endpoints subject to the rule is allowed to communicate.
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      toPorts:
                        description: |-
                          ToPorts is a list of destination ports identified by port number and
                          protocol which the endpoint subject to the rule is not allowed to connect
                          to.

                          Example:
                          Any endpoint with the label "role=frontend" is not allowed to initiate
                          connections to destination port 8080/tcp
                        items:
                          description: |-
                            PortDenyRule is a list of ports/protocol that should be used for deny
                            policies. This structure lacks the L7Rules since it's not supported in deny
                            policies.
                          properties:
                            ports:
                              description: Ports is a list of L4 port/protocol
                              items:
                                description: PortProtocol specifies an L4 port with
                                  an optional transport protocol
                                properties:
                                  endPort:
                                    description: EndPort can only be an L4 port
                                      number.
                                    format: int32
                                    maximum: 65535
                                    minimum: 0
                                    type: integer
                                  port:
                                    description: |-
                                      Port can be an L4 port number, or a name in the form of "http"
                                      or "http-8080".
                                    pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                    type: string
                                  protocol:
                                    description: |-
                                      Protocol is the L4 protocol. If omitted or empty, any protocol
                                      matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                      Matching on ICMP is not supported.

                                      Named port specified for a container may narrow this down, but may not
                                      contradict this.
                                    enum:
                                    - TCP
                                    - UDP
                                    - SCTP
                                    - ANY
                                    type: string
                                required:
                                - port
                                type: object
                              type: array
                          type: object
                        type: array
                      toRequires:
                        description: |-
                          ToRequires is a list of additional constraints which must be met
                          in order for the selected endpoints to be able to connect to other
                          endpoints. These additional constraints do no by itself grant access
                          privileges and must always be accompanied with at least one matching
                          ToEndpoints.

                          Example:
                          Any Endpoint with the label "team=A" requires any endpoint to which it
                          communicates to also carry the label "team=A".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      toServices:
                        description: |-
                          ToServices is a list of services to which the endpoint subject
                          to the rule is allowed to initiate connections.
                          Currently Cilium only supports toServices for K8s services.
                        items:
                          description: |-
                            Service selects policy targets that are bundled as part of a
                            logical load-balanced service.

                            Currently only Kubernetes-based Services are supported.
                          properties:
                            k8sService:
                              description: K8sService selects service by name and
                                namespace pair
                              properties:
                                namespace:
                                  type: string
                                serviceName:
                                  type: string
                              type: object
                            k8sServiceSelector:
                              description: K8sServiceSelector selects services by
                                k8s labels and namespace
                              properties:
                                namespace:
                                  type: string
                                selector:
                                  description: ServiceSelector is a label selector
                                    for k8s services
                                  properties:
                                    matchExpressions:
                                      description: matchExpressions is a list of
                                        label selector requirements. The requirements
                                        are ANDed.
                                      items:
                                        description: |-
                                          A label selector requirement is a selector that contains values, a key, and an operator that
                                          relates the key and values.
                                        properties:
                                          key:
                                            description: key is the label key that
                                              the selector applies to.
                                            type: string
                                          operator:
                                            description: |-
                                              operator represents a key's relationship to a set of values.
                                              Valid operators are In, NotIn, Exists and DoesNotExist.
                                            enum:
                                            - In
                                            - NotIn
                                            - Exists
                                            - DoesNotExist
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
                                        description: MatchLabelsValue represents
                                          the value from the MatchLabels {key,value}
                                          pair.
                                        maxLength: 63
                                        pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                        type: string
                                      description: |-
                                        matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                        map is equivalent to an element of matchExpressions, whose key field is "key", the
                                        operator is "In", and the values array contains only "value". The requirements are ANDed.
                                      type: object
                                  type: object
                                  x-kubernetes-map-type: atomic
                              required:
                              - selector
                              type: object
                          type: object
                        type: array
                    type: object
                  type: array
                enableDefaultDeny:
                  description: |-
                    EnableDefaultDeny determines whether this policy configures the
                    subject endpoint(s) to have a default deny mode. If enabled,
                    this causes all traffic not explicitly allowed by a network policy
                    to be dropped.

                    If not specified, the default is true for each traffic direction
                    that has rules, and false otherwise. For example, if a policy
                    only has Ingress or IngressDeny rules, then the default for
                    ingress is true and egress is false.

                    If multiple policies apply to an endpoint, that endpoint's default deny
                    will be enabled if any policy requests it.

                    This is useful for creating broad-based network policies that will not
                    cause endpoints to enter default-deny mode.
                  properties:
                    egress:
                      description: |-
                        Whether or not the endpoint should have a default-deny rule applied
                        to egress traffic.
                      type: boolean
                    ingress:
                      description: |-
                        Whether or not the endpoint should have a default-deny rule applied
                        to ingress traffic.
                      type: boolean
                  type: object
                endpointSelector:
                  description: |-
                    EndpointSelector selects all endpoints which should be subject to
                    this rule. EndpointSelector and NodeSelector cannot be both empty and
                    are mutually exclusive.
                  properties:
                    matchExpressions:
                      description: matchExpressions is a list of label selector
                        requirements. The requirements are ANDed.
                      items:
                        description: |-
                          A label selector requirement is a selector that contains values, a key, and an operator that
                          relates the key and values.
                        properties:
                          key:
                            description: key is the label key that the selector
                              applies to.
                            type: string
                          operator:
                            description: |-
                              operator represents a key's relationship to a set of values.
                              Valid operators are In, NotIn, Exists and DoesNotExist.
                            enum:
                            - In
                            - NotIn
                            - Exists
                            - DoesNotExist
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
                        description: MatchLabelsValue represents the value from
                          the MatchLabels {key,value} pair.
                        maxLength: 63
                        pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                        type: string
                      description: |-
                        matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                        map is equivalent to an element of matchExpressions, whose key field is "key", the
                        operator is "In", and the values array contains only "value". The requirements are ANDed.
                      type: object
                  type: object
                  x-kubernetes-map-type: atomic
                ingress:
                  description: |-
                    Ingress is a list of IngressRule which are enforced at ingress.
                    If omitted or empty, this rule does not apply at ingress.
                  items:
                    description: |-
                      IngressRule contains all rule types which can be applied at ingress,
                      i.e. network traffic that originates outside of the endpoint and
                      is entering the endpoint selected by the endpointSelector.

                        - All members of this structure are optional. If omitted or empty, the
                          member will have no effect on the rule.

                        - If multiple members are set, all of them need to match in order for
                          the rule to take effect. The exception to this rule is FromRequires field;
                          the effects of any Requires field in any rule will apply to all other
                          rules as well.

                        - FromEndpoints, FromCIDR, FromCIDRSet and FromEntities are mutually
                          exclusive. Only one of these members may be present within an individual
                          rule.
                    properties:
                      authentication:
                        description: Authentication is the required authentication
                          type for the allowed traffic, if any.
                        properties:
                          mode:
                            description: Mode is the required authentication mode
                              for the allowed traffic, if any.
                            enum:
                            - disabled
                            - required
                            - test-always-fail
                            type: string
                        required:
                        - mode
                        type: object
                      fromCIDR:
                        description: |-
                          FromCIDR is a list of IP blocks which the endpoint subject to the
                          rule is allowed to receive connections from. Only connections which
                          do *not* originate from the cluster or from the local host are subject
                          to CIDR rules. In order to allow in-cluster connectivity, use the
                          FromEndpoints field.  This will match on the source IP address of
                          incoming connections. Adding  a prefix into FromCIDR or into
                          FromCIDRSet with no ExcludeCIDRs is  equivalent.  Overlaps are
                          allowed between FromCIDR and FromCIDRSet.

                          Example:
                          Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                          connections from 10.3.9.1
                        items:
                          description: |-
                            CIDR specifies a block of IP addresses.
                            Example: 192.0.2.1/32
                          format: cidr
                          type: string
                        type: array
                      fromCIDRSet:
                        description: |-
                          FromCIDRSet is a list of IP blocks which the endpoint subject to the
                          rule is allowed to receive connections from in addition to FromEndpoints,
                          along with a list of subnets contained within their corresponding IP block
                          from which traffic should not be allowed.
                          This will match on the source IP address of incoming connections. Adding
                          a prefix into FromCIDR or into FromCIDRSet with no ExcludeCIDRs is
                          equivalent. Overlaps are allowed between FromCIDR and FromCIDRSet.

                          Example:
                          Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                          connections from 10.0.0.0/8 except from IPs in subnet 10.96.0.0/12.
                        items:
                          description: |-
                            CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                            communication  is allowed, along with an optional list of subnets within that
                            CIDR prefix to/from which outside communication is not allowed.
                          oneOf:
                          - properties:
                              cidr: {}
                            required:
                            - cidr
                          - properties:
                              cidrGroupRef: {}
                            required:
                            - cidrGroupRef
                          - properties:
                              cidrGroupSelector: {}
                            required:
                            - cidrGroupSelector
                          properties:
                            cidr:
                              description: CIDR is a CIDR prefix / IP Block.
                              format: cidr
                              type: string
                            cidrGroupRef:
                              description: |-
                                CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                                A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                                the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                                connections from.
                              maxLength: 253
                              pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                              type: string
                            cidrGroupSelector:
                              description: |-
                                CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                                rather than by name.
                              properties:
                                matchExpressions:
                                  description: matchExpressions is a list of label
                                    selector requirements. The requirements are
                                    ANDed.
                                  items:
                                    description: |-
                                      A label selector requirement is a selector that contains values, a key, and an operator that
                                      relates the key and values.
                                    properties:
                                      key:
                                        description: key is the label key that the
                                          selector applies to.
                                        type: string
                                      operator:
                                        description: |-
                                          operator represents a key's relationship to a set of values.
                                          Valid operators are In, NotIn, Exists and DoesNotExist.
                                        enum:
                                        - In
                                        - NotIn
                                        - Exists
                                        - DoesNotExist
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
                                    description: MatchLabelsValue represents the
                                      value from the MatchLabels {key,value} pair.
                                    maxLength: 63
                                    pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                    type: string
                                  description: |-
                                    matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                    map is equivalent to an element of matchExpressions, whose key field is "key", the
                                    operator is "In", and the values array contains only "value". The requirements are ANDed.
                                  type: object
                              type: object
                              x-kubernetes-map-type: atomic
                            except:
                              description: |-
                                ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                                is not allowed to initiate connections to. These CIDR prefixes should be
                                contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                                supported yet.
                                These exceptions are only applied to the Cidr in this CIDRRule, and do not
                                apply to any other CIDR prefixes in any other CIDRRules.
                              items:
                                description: |-
                                  CIDR specifies a block of IP addresses.
                                  Example: 192.0.2.1/32
                                format: cidr
                                type: string
                              type: array
                          type: object
                        type: array
                      fromEndpoints:
                        description: |-
                          FromEndpoints is a list of endpoints identified by an
                          EndpointSelector which are allowed to communicate with the endpoint
                          subject to the rule.

                          Example:
                          Any endpoint with the label "role=backend" can be consumed by any
                          endpoint carrying the label "role=frontend".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      fromEntities:
                        description: |-
                          FromEntities is a list of special entities which the endpoint subject
                          to the rule is allowed to receive connections from. Supported entities are
                          `world`, `cluster` and `host`
                        items:
                          description: |-
                            Entity specifies the class of receiver/sender endpoints that do not have
                            individual identities.  Entities are used to describe "outside of cluster",
                            "host", etc.
                          enum:
                          - all
                          - world
                          - cluster
                          - host
                          - init
                          - ingress
                          - unmanaged
                          - remote-node
                          - health
                          - none
                          - kube-apiserver
                          type: string
                        type: array
                      fromGroups:
                        description: |-
                          FromGroups is a directive that allows the integration with multiple outside
                          providers. Currently, only AWS is supported, and the rule can select by
                          multiple sub directives:

                          Example:
                          FromGroups:
                          - aws:
                              securityGroupsIds:
                              - 'sg-XXXXXXXXXXXXX'
                        items:
                          description: |-
                            Groups structure to store all kinds of new integrations that needs a new
                            derivative policy.
                          properties:
                            aws:
                              description: AWSGroup is an structure that can be
                                used to whitelisting information from AWS integration
                              properties:
                                labels:
                                  additionalProperties:
                                    type: string
                                  type: object
                                region:
                                  type: string
                                securityGroupsIds:
                                  items:
                                    type: string
                                  type: array
                                securityGroupsNames:
                                  items:
                                    type: string
                                  type: array
                              type: object
                          type: object
                        type: array
                      fromNodes:
                        description: |-
                          FromNodes is a list of nodes identified by an
                          EndpointSelector which are allowed to communicate with the endpoint
                          subject to the rule.
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      fromRequires:
                        description: |-
                          FromRequires is a list of additional constraints which must be met
                          in order for the selected endpoints to be reachable. These
                          additional constraints do no by itself grant access privileges and
                          must always be accompanied with at least one matching FromEndpoints.

                          Example:
                          Any Endpoint with the label "team=A" requires consuming endpoint
                          to also carry the label "team=A".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      icmps:
                        description: |-
                          ICMPs is a list of ICMP rule identified by type number
                          which the endpoint subject to the rule is allowed to
                          receive connections on.

                          Example:
                          Any endpoint with the label "app=httpd" can only accept incoming
                          type 8 ICMP connections.
                        items:
                          description: ICMPRule is a list of ICMP fields.
                          properties:
                            fields:
                              description: Fields is a list of ICMP fields.
                              items:
                                description: ICMPField is a ICMP field.
                                properties:
                                  family:
                                    default: IPv4
                                    description: |-
                                      Family is a IP address version.
                                      Currently, we support `IPv4` and `IPv6`.
                                      `IPv4` is set as default.
                                    enum:
                                    - IPv4
                                    - IPv6
                                    type: string
                                  type:
                                    anyOf:
                                    - type: integer
                                    - type: string
                                    description: "Type is a ICMP-type.\nIt should
                                      be an 8bit code (0-255), or it's CamelCase
                                      name (for example, \"EchoReply\").\nAllowed
                                      ICMP types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                      | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                      | RouterSelection | TimeExceeded | ParameterProblem
                                      |\n\t\t\t Timestamp | TimestampReply | Photuris
                                      | ExtendedEcho Request | ExtendedEcho Reply\n
                                      \   Ipv6: DestinationUnreachable | PacketTooBig
                                      | TimeExceeded | ParameterProblem |\n\t\t\t
                                      EchoRequest | EchoReply | MulticastListenerQuery|
                                      MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                      | RouterSolicitation | RouterAdvertisement
                                      | NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                      | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                      |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                      | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                      HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                      | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                      | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                      |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                    pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                      Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                    x-kubernetes-int-or-string: true
                                required:
                                - type
                                type: object
                              maxItems: 40
                              type: array
                          type: object
                        type: array
                      toPorts:
                        description: |-
                          ToPorts is a list of destination ports identified by port number and
                          protocol which the endpoint subject to the rule is allowed to
                          receive connections on.

                          Example:
                          Any endpoint with the label "app=httpd" can only accept incoming
                          connections on port 80/tcp.
                        items:
                          description: |-
                            PortRule is a list of ports/protocol combinations with optional Layer 7
                            rules which must be met.
                          properties:
                            listener:
                              description: |-
                                listener specifies the name of a custom Envoy listener to which this traffic should be
                                redirected to.
                              properties:
                                envoyConfig:
                                  description: |-
                                    EnvoyConfig is a reference to the CEC or CCEC resource in which
                                    the listener is defined.
                                  properties:
                                    kind:
                                      description: |-
                                        Kind is the resource type being referred to. Defaults to CiliumEnvoyConfig or
                                        CiliumClusterwideEnvoyConfig for CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy,
                                        respectively. The only case this is currently explicitly needed is when referring to a
                                        CiliumClusterwideEnvoyConfig from CiliumNetworkPolicy, as using a namespaced listener
                                        from a cluster scoped policy is not allowed.
                                      enum:
                                      - CiliumEnvoyConfig
                                      - CiliumClusterwideEnvoyConfig
                                      type: string
                                    name:
                                      description: |-
                                        Name is the resource name of the CiliumEnvoyConfig or CiliumClusterwideEnvoyConfig where
                                        the listener is defined in.
                                      minLength: 1
                                      type: string
                                  required:
                                  - name
                                  type: object
                                name:
                                  description: Name is the name of the listener.
                                  minLength: 1
                                  type: string
                                priority:
                                  description: |-
                                    Priority for this Listener that is used when multiple rules would apply different
                                    listeners to a policy map entry. Behavior of this is implementation dependent.
                                  maximum: 100
                                  minimum: 1
                                  type: integer
                              required:
                              - envoyConfig
                              - name
                              type: object
                            originatingTLS:
                              description: |-
                                OriginatingTLS is the TLS context for the connections originated by
                                the L7 proxy.  For egress policy this specifies the client-side TLS
                                parameters for the upstream connection originating from the L7 proxy
                                to the remote destination. For ingress policy this specifies the
                                client-side TLS parameters for the connection from the L7 proxy to
                                the local endpoint.
                              properties:
                                certificate:
                                  description: |-
                                    Certificate is the file name or k8s secret item name for the certificate
                                    chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                    item must exist.
                                  type: string
                                privateKey:
                                  description: |-
                                    PrivateKey is the file name or k8s secret item name for the private key
                                    matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                    exists. If given, the item must exist.
                                  type: string
                                secret:
                                  description: |-
                                    Secret is the secret that contains the certificates and private key for
                                    the TLS context.
                                    By default, Cilium will search in this secret for the following items:
                                      - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                      - 'tls.crt' - Which represents the public key certificate.
                                      - 'tls.key' - Which represents the private key matching the public key
                                                    certificate.
                                  properties:
                                    name:
                                      description: Name is the name of the secret.
                                      type: string
                                    namespace:
                                      description: |-
                                        Namespace is the namespace in which the secret exists. Context of use
                                        determines the default value if left out (e.g., "default").
                                      type: string
                                  required:
                                  - name
                                  type: object
                                trustedCA:
                                  description: |-
                                    TrustedCA is the file name or k8s secret item name for the trusted CA.
                                    If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                    exist.
                                  type: string
                              required:
                              - secret
                              type: object
                            ports:
                              description: Ports is a list of L4 port/protocol
                              items:
                                description: PortProtocol specifies an L4 port with
                                  an optional transport protocol
                                properties:
                                  endPort:
                                    description: EndPort can only be an L4 port
                                      number.
                                    format: int32
                                    maximum: 65535
                                    minimum: 0
                                    type: integer
                                  port:
                                    description: |-
                                      Port can be an L4 port number, or a name in the form of "http"
                                      or "http-8080".
                                    pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                    type: string
                                  protocol:
                                    description: |-
                                      Protocol is the L4 protocol. If omitted or empty, any protocol
                                      matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                      Matching on ICMP is not supported.

                                      Named port specified for a container may narrow this down, but may not
                                      contradict this.
                                    enum:
                                    - TCP
                                    - UDP
                                    - SCTP
                                    - ANY
                                    type: string
                                required:
                                - port
                                type: object
                              maxItems: 40
                              type: array
                            rules:
                              description: |-
                                Rules is a list of additional port level rules which must be met in
                                order for the PortRule to allow the traffic. If omitted or empty,
                                no layer 7 rules are enforced.
                              oneOf:
                              - properties:
                                  http: {}
                                required:
                                - http
                              - properties:
                                  kafka: {}
                                required:
                                - kafka
                              - properties:
                                  dns: {}
                                required:
                                - dns
                              - properties:
                                  l7proto: {}
                                required:
                                - l7proto
                              properties:
                                dns:
                                  description: DNS-specific rules.
                                  items:
                                    description: PortRuleDNS is a list of allowed
                                      DNS lookups.
                                    oneOf:
                                    - properties:
                                        matchName: {}
                                      required:
                                      - matchName
                                    - properties:
                                        matchPattern: {}
                                      required:
                                      - matchPattern
                                    properties:
                                      matchName:
                                        description: |-
                                          MatchName matches literal DNS names. A trailing "." is automatically added
                                          when missing.
                                        maxLength: 255
                                        pattern: ^([-a-zA-Z0-9_]+[.]?)+$
                                        type: string
                                      matchPattern:
                                        description: |-
                                          MatchPattern allows using wildcards to match DNS names. All wildcards are
                                          case insensitive. The wildcards are:
                                          - "*" matches 0 or more DNS valid characters, and may occur anywhere in
                                          the pattern. As a special case a "*" as the leftmost character, without a
                                          following "." matches all subdomains as well as the name to the right.
                                          A trailing "." is automatically added when missing.

                                          Examples:
                                          `*.cilium.io` matches subomains of cilium at that level
                                            www.cilium.io and blog.cilium.io match, cilium.io and google.com do not
                                          `*cilium.io` matches cilium.io and all subdomains ends with "cilium.io"
                                            except those containing "." separator, subcilium.io and sub-cilium.io match,
                                            www.cilium.io and blog.cilium.io does not
                                          sub*.cilium.io matches subdomains of cilium where the subdomain component
                                          begins with "sub"
                                            sub.cilium.io and subdomain.cilium.io match, www.cilium.io,
                                            blog.cilium.io, cilium.io and google.com do not
                                        maxLength: 255
                                        pattern: ^([-a-zA-Z0-9_*]+[.]?)+$
                                        type: string
                                    type: object
                                  type: array
                                http:
                                  description: HTTP specific rules.
                                  items:
                                    description: |-
                                      PortRuleHTTP is a list of HTTP protocol constraints. All fields are
                                      optional, if all fields are empty or missing, the rule does not have any
                                      effect.

                                      All fields of this type are extended POSIX regex as defined by IEEE Std
                                      1003.1, (i.e this follows the egrep/unix syntax, not the perl syntax)
                                      matched against the path of an incoming request. Currently it can contain
                                      characters disallowed from the conventional "path" part of a URL as defined
                                      by RFC 3986.
                                    properties:
                                      headerMatches:
                                        description: |-
                                          HeaderMatches is a list of HTTP headers which must be
                                          present and match against the given values. Mismatch field can be used
                                          to specify what to do when there is no match.
                                        items:
                                          description: |-
                                            HeaderMatch extends the HeaderValue for matching requirement of a
                                            named header field against an immediate string, a secret value, or
                                            a regex.  If none of the optional fields is present, then the
                                            header value is not matched, only presence of the header is enough.
                                          properties:
                                            mismatch:
                                              description: |-
                                                Mismatch identifies what to do in case there is no match. The default is
                                                to drop the request. Otherwise the overall rule is still considered as
                                                matching, but the mismatches are logged in the access log.
                                              enum:
                                              - LOG
                                              - ADD
                                              - DELETE
                                              - REPLACE
                                              type: string
                                            name:
                                              description: Name identifies the header.
                                              minLength: 1
                                              type: string
                                            secret:
                                              description: |-
                                                Secret refers to a secret that contains the value to be matched against.
                                                The secret must only contain one entry. If the referred secret does not
                                                exist, and there is no "Value" specified, the match will fail.
                                              properties:
                                                name:
                                                  description: Name is the name
                                                    of the secret.
                                                  type: string
                                                namespace:
                                                  description: |-
                                                    Namespace is the namespace in which the secret exists. Context of use
                                                    determines the default value if left out (e.g., "default").
                                                  type: string
                                              required:
                                              - name
                                              type: object
                                            value:
                                              description: |-
                                                Value matches the exact value of the header. Can be specified either
                                                alone or together with "Secret"; will be used as the header value if the
                                                secret can not be found in the latter case.
                                              type: string
                                          required:
                                          - name
                                          type: object
                                        type: array
                                      headers:
                                        description: |-
                                          Headers is a list of HTTP headers which must be present in the
                                          request. If omitted or empty, requests are allowed regardless of
                                          headers present.
                                        items:
                                          type: string
                                        type: array
                                      host:
                                        description: |-
                                          Host is an extended POSIX regex matched against the host header of a
                                          request. Examples:

                                          - foo.bar.com will match the host fooXbar.com or foo-bar.com
                                          - foo\.bar\.com will only match the host foo.bar.com

                                          If omitted or empty, the value of the host header is ignored.
                                        format: idn-hostname
                                        type: string
                                      method:
                                        description: |-
                                          Method is an extended POSIX regex matched against the method of a
                                          request, e.g. "GET", "POST", "PUT", "PATCH", "DELETE", ...

                                          If omitted or empty, all methods are allowed.
                                        type: string
                                      path:
                                        description: |-
                                          Path is an extended POSIX regex matched against the path of a
                                          request. Currently it can contain characters disallowed from the
                                          conventional "path" part of a URL as defined by RFC 3986.

                                          If omitted or empty, all paths are all allowed.
                                        type: string
                                    type: object
                                  type: array
                                kafka:
                                  description: Kafka-specific rules.
                                  items:
                                    description: |-
                                      PortRule is a list of Kafka protocol constraints. All fields are
                                      optional, if all fields are empty or missing, the rule will match all
                                      Kafka messages.
                                    properties:
                                      apiKey:
                                        description: |-
                                          APIKey is a case-insensitive string matched against the key of a
                                          request, e.g. "produce", "fetch", "createtopic", "deletetopic", et al
                                          Reference: https://kafka.apache.org/protocol#protocol_api_keys

                                          If omitted or empty, and if Role is not specified, then all keys are allowed.
                                        type: string
                                      apiVersion:
                                        description: |-
                                          APIVersion is the version matched against the api version of the
                                          Kafka message. If set, it has to be a string representing a positive
                                          integer.

                                          If omitted or empty, all versions are allowed.
                                        type: string
                                      clientID:
                                        description: |-
                                          ClientID is the client identifier as provided in the request.

                                          From Kafka protocol documentation:
                                          This is a user supplied identifier for the client application. The
                                          user can use any identifier they like and it will be used when
                                          logging errors, monitoring aggregates, etc. For example, one might
                                          want to monitor not just the requests per second overall, but the
                                          number coming from each client application (each of which could
                                          reside on multiple servers). This id acts as a logical grouping
                                          across all requests from a particular client.

                                          If omitted or empty, all client identifiers are allowed.
                                        type: string
                                      role:
                                        description: |-
                                          Role is a case-insensitive string and describes a group of API keys
                                          necessary to perform certain higher-level Kafka operations such as "produce"
                                          or "consume". A Role automatically expands into all APIKeys required
                                          to perform the specified higher-level operation.

                                          The following values are supported:
                                            - "produce": Allow producing to the topics specified in the rule
                                            - "consume": Allow consuming from the topics specified in the rule

                                          This field is incompatible with the APIKey field, i.e APIKey and Role
                                          cannot both be specified in the same rule.

                                          If omitted or empty, and if APIKey is not specified, then all keys are
                                          allowed.
                                        enum:
                                        - produce
                                        - consume
                                        type: string
                                      topic:
                                        description: |-
                                          Topic is the topic name contained in the message. If a Kafka request
                                          contains multiple topics, then all topics must be allowed or the
                                          message will be rejected.

                                          This constraint is ignored if the matched request message type
                                          doesn't contain any topic. Maximum size of Topic can be 249
                                          characters as per recent Kafka spec and allowed characters are
                                          a-z, A-Z, 0-9, -, . and _.

                                          Older Kafka versions had longer topic lengths of 255, but in Kafka 0.10
                                          version the length was changed from 255 to 249. For compatibility
                                          reasons we are using 255.

                                          If omitted or empty, all topics are allowed.
                                        maxLength: 255
                                        type: string
                                    type: object
                                  type: array
                                l7:
                                  description: Key-value pair rules.
                                  items:
                                    additionalProperties:
                                      type: string
                                    description: |-
                                      PortRuleL7 is a list of key-value pairs interpreted by a L7 protocol as
                                      protocol constraints. All fields are optional, if all fields are empty or
                                      missing, the rule does not have any effect.
                                    type: object
                                  type: array
                                l7proto:
                                  description: Name of the L7 protocol for which
                                    the Key-value pair rules apply.
                                  type: string
                              type: object
                            serverNames:
                              description: |-
                                ServerNames is a list of allowed TLS SNI values. If not empty, then
                                TLS must be present and one of the provided SNIs must be indicated in the
                                TLS handshake.
                              items:
                                type: string
                              type: array
                            terminatingTLS:
                              description: |-
                                TerminatingTLS is the TLS context for the connection terminated by
                                the L7 proxy.  For egress policy this specifies the server-side TLS
                                parameters to be applied on the connections originated from the local
                                endpoint and terminated by the L7 proxy. For ingress policy this specifies
                                the server-side TLS parameters to be applied on the connections
                                originated from a remote source and terminated by the L7 proxy.
                              properties:
                                certificate:
                                  description: |-
                                    Certificate is the file name or k8s secret item name for the certificate
                                    chain. If omitted, 'tls.crt' is assumed, if it exists. If given, the
                                    item must exist.
                                  type: string
                                privateKey:
                                  description: |-
                                    PrivateKey is the file name or k8s secret item name for the private key
                                    matching the certificate chain. If omitted, 'tls.key' is assumed, if it
                                    exists. If given, the item must exist.
                                  type: string
                                secret:
                                  description: |-
                                    Secret is the secret that contains the certificates and private key for
                                    the TLS context.
                                    By default, Cilium will search in this secret for the following items:
                                      - 'ca.crt'  - Which represents the trusted CA to verify remote source.
                                      - 'tls.crt' - Which represents the public key certificate.
                                      - 'tls.key' - Which represents the private key matching the public key
                                                    certificate.
                                  properties:
                                    name:
                                      description: Name is the name of the secret.
                                      type: string
                                    namespace:
                                      description: |-
                                        Namespace is the namespace in which the secret exists. Context of use
                                        determines the default value if left out (e.g., "default").
                                      type: string
                                  required:
                                  - name
                                  type: object
                                trustedCA:
                                  description: |-
                                    TrustedCA is the file name or k8s secret item name for the trusted CA.
                                    If omitted, 'ca.crt' is assumed, if it exists. If given, the item must
                                    exist.
                                  type: string
                              required:
                              - secret
                              type: object
                          type: object
                        type: array
                    type: object
                  type: array
                ingressDeny:
                  description: |-
                    IngressDeny is a list of IngressDenyRule which are enforced at ingress.
                    Any rule inserted here will be denied regardless of the allowed ingress
                    rules in the 'ingress' field.
                    If omitted or empty, this rule does not apply at ingress.
                  items:
                    description: |-
                      IngressDenyRule contains all rule types which can be applied at ingress,
                      i.e. network traffic that originates outside of the endpoint and
                      is entering the endpoint selected by the endpointSelector.

                        - All members of this structure are optional. If omitted or empty, the
                          member will have no effect on the rule.

                        - If multiple members are set, all of them need to match in order for
                          the rule to take effect. The exception to this rule is FromRequires field;
                          the effects of any Requires field in any rule will apply to all other
                          rules as well.

                        - FromEndpoints, FromCIDR, FromCIDRSet, FromGroups and FromEntities are mutually
                          exclusive. Only one of these members may be present within an individual
                          rule.
                    properties:
                      fromCIDR:
                        description: |-
                          FromCIDR is a list of IP blocks which the endpoint subject to the
                          rule is allowed to receive connections from. Only connections which
                          do *not* originate from the cluster or from the local host are subject
                          to CIDR rules. In order to allow in-cluster connectivity, use the
                          FromEndpoints field.  This will match on the source IP address of
                          incoming connections. Adding  a prefix into FromCIDR or into
                          FromCIDRSet with no ExcludeCIDRs is  equivalent.  Overlaps are
                          allowed between FromCIDR and FromCIDRSet.

                          Example:
                          Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                          connections from 10.3.9.1
                        items:
                          description: |-
                            CIDR specifies a block of IP addresses.
                            Example: 192.0.2.1/32
                          format: cidr
                          type: string
                        type: array
                      fromCIDRSet:
                        description: |-
                          FromCIDRSet is a list of IP blocks which the endpoint subject to the
                          rule is allowed to receive connections from in addition to FromEndpoints,
                          along with a list of subnets contained within their corresponding IP block
                          from which traffic should not be allowed.
                          This will match on the source IP address of incoming connections. Adding
                          a prefix into FromCIDR or into FromCIDRSet with no ExcludeCIDRs is
                          equivalent. Overlaps are allowed between FromCIDR and FromCIDRSet.

                          Example:
                          Any endpoint with the label "app=my-legacy-pet" is allowed to receive
                          connections from 10.0.0.0/8 except from IPs in subnet 10.96.0.0/12.
                        items:
                          description: |-
                            CIDRRule is a rule that specifies a CIDR prefix to/from which outside
                            communication  is allowed, along with an optional list of subnets within that
                            CIDR prefix to/from which outside communication is not allowed.
                          oneOf:
                          - properties:
                              cidr: {}
                            required:
                            - cidr
                          - properties:
                              cidrGroupRef: {}
                            required:
                            - cidrGroupRef
                          - properties:
                              cidrGroupSelector: {}
                            required:
                            - cidrGroupSelector
                          properties:
                            cidr:
                              description: CIDR is a CIDR prefix / IP Block.
                              format: cidr
                              type: string
                            cidrGroupRef:
                              description: |-
                                CIDRGroupRef is a reference to a CiliumCIDRGroup object.
                                A CiliumCIDRGroup contains a list of CIDRs that the endpoint, subject to
                                the rule, can (Ingress/Egress) or cannot (IngressDeny/EgressDeny) receive
                                connections from.
                              maxLength: 253
                              pattern: ^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$
                              type: string
                            cidrGroupSelector:
                              description: |-
                                CIDRGroupSelector selects CiliumCIDRGroups by their labels,
                                rather than by name.
                              properties:
                                matchExpressions:
                                  description: matchExpressions is a list of label
                                    selector requirements. The requirements are
                                    ANDed.
                                  items:
                                    description: |-
                                      A label selector requirement is a selector that contains values, a key, and an operator that
                                      relates the key and values.
                                    properties:
                                      key:
                                        description: key is the label key that the
                                          selector applies to.
                                        type: string
                                      operator:
                                        description: |-
                                          operator represents a key's relationship to a set of values.
                                          Valid operators are In, NotIn, Exists and DoesNotExist.
                                        enum:
                                        - In
                                        - NotIn
                                        - Exists
                                        - DoesNotExist
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
                                    description: MatchLabelsValue represents the
                                      value from the MatchLabels {key,value} pair.
                                    maxLength: 63
                                    pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                    type: string
                                  description: |-
                                    matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                    map is equivalent to an element of matchExpressions, whose key field is "key", the
                                    operator is "In", and the values array contains only "value". The requirements are ANDed.
                                  type: object
                              type: object
                              x-kubernetes-map-type: atomic
                            except:
                              description: |-
                                ExceptCIDRs is a list of IP blocks which the endpoint subject to the rule
                                is not allowed to initiate connections to. These CIDR prefixes should be
                                contained within Cidr, using ExceptCIDRs together with CIDRGroupRef is not
                                supported yet.
                                These exceptions are only applied to the Cidr in this CIDRRule, and do not
                                apply to any other CIDR prefixes in any other CIDRRules.
                              items:
                                description: |-
                                  CIDR specifies a block of IP addresses.
                                  Example: 192.0.2.1/32
                                format: cidr
                                type: string
                              type: array
                          type: object
                        type: array
                      fromEndpoints:
                        description: |-
                          FromEndpoints is a list of endpoints identified by an
                          EndpointSelector which are allowed to communicate with the endpoint
                          subject to the rule.

                          Example:
                          Any endpoint with the label "role=backend" can be consumed by any
                          endpoint carrying the label "role=frontend".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      fromEntities:
                        description: |-
                          FromEntities is a list of special entities which the endpoint subject
                          to the rule is allowed to receive connections from. Supported entities are
                          `world`, `cluster` and `host`
                        items:
                          description: |-
                            Entity specifies the class of receiver/sender endpoints that do not have
                            individual identities.  Entities are used to describe "outside of cluster",
                            "host", etc.
                          enum:
                          - all
                          - world
                          - cluster
                          - host
                          - init
                          - ingress
                          - unmanaged
                          - remote-node
                          - health
                          - none
                          - kube-apiserver
                          type: string
                        type: array
                      fromGroups:
                        description: |-
                          FromGroups is a directive that allows the integration with multiple outside
                          providers. Currently, only AWS is supported, and the rule can select by
                          multiple sub directives:

                          Example:
                          FromGroups:
                          - aws:
                              securityGroupsIds:
                              - 'sg-XXXXXXXXXXXXX'
                        items:
                          description: |-
                            Groups structure to store all kinds of new integrations that needs a new
                            derivative policy.
                          properties:
                            aws:
                              description: AWSGroup is an structure that can be
                                used to whitelisting information from AWS integration
                              properties:
                                labels:
                                  additionalProperties:
                                    type: string
                                  type: object
                                region:
                                  type: string
                                securityGroupsIds:
                                  items:
                                    type: string
                                  type: array
                                securityGroupsNames:
                                  items:
                                    type: string
                                  type: array
                              type: object
                          type: object
                        type: array
                      fromNodes:
                        description: |-
                          FromNodes is a list of nodes identified by an
                          EndpointSelector which are allowed to communicate with the endpoint
                          subject to the rule.
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      fromRequires:
                        description: |-
                          FromRequires is a list of additional constraints which must be met
                          in order for the selected endpoints to be reachable. These
                          additional constraints do no by itself grant access privileges and
                          must always be accompanied with at least one matching FromEndpoints.

                          Example:
                          Any Endpoint with the label "team=A" requires consuming endpoint
                          to also carry the label "team=A".
                        items:
                          description: EndpointSelector is a wrapper for k8s LabelSelector.
                          properties:
                            matchExpressions:
                              description: matchExpressions is a list of label selector
                                requirements. The requirements are ANDed.
                              items:
                                description: |-
                                  A label selector requirement is a selector that contains values, a key, and an operator that
                                  relates the key and values.
                                properties:
                                  key:
                                    description: key is the label key that the selector
                                      applies to.
                                    type: string
                                  operator:
                                    description: |-
                                      operator represents a key's relationship to a set of values.
                                      Valid operators are In, NotIn, Exists and DoesNotExist.
                                    enum:
                                    - In
                                    - NotIn
                                    - Exists
                                    - DoesNotExist
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
                                description: MatchLabelsValue represents the value
                                  from the MatchLabels {key,value} pair.
                                maxLength: 63
                                pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                                type: string
                              description: |-
                                matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                                map is equivalent to an element of matchExpressions, whose key field is "key", the
                                operator is "In", and the values array contains only "value". The requirements are ANDed.
                              type: object
                          type: object
                          x-kubernetes-map-type: atomic
                        type: array
                      icmps:
                        description: |-
                          ICMPs is a list of ICMP rule identified by type number
                          which the endpoint subject to the rule is not allowed to
                          receive connections on.

                          Example:
                          Any endpoint with the label "app=httpd" can not accept incoming
                          type 8 ICMP connections.
                        items:
                          description: ICMPRule is a list of ICMP fields.
                          properties:
                            fields:
                              description: Fields is a list of ICMP fields.
                              items:
                                description: ICMPField is a ICMP field.
                                properties:
                                  family:
                                    default: IPv4
                                    description: |-
                                      Family is a IP address version.
                                      Currently, we support `IPv4` and `IPv6`.
                                      `IPv4` is set as default.
                                    enum:
                                    - IPv4
                                    - IPv6
                                    type: string
                                  type:
                                    anyOf:
                                    - type: integer
                                    - type: string
                                    description: "Type is a ICMP-type.\nIt should
                                      be an 8bit code (0-255), or it's CamelCase
                                      name (for example, \"EchoReply\").\nAllowed
                                      ICMP types are:\n    Ipv4: EchoReply | DestinationUnreachable
                                      | Redirect | Echo | EchoRequest |\n\t\t     RouterAdvertisement
                                      | RouterSelection | TimeExceeded | ParameterProblem
                                      |\n\t\t\t Timestamp | TimestampReply | Photuris
                                      | ExtendedEcho Request | ExtendedEcho Reply\n
                                      \   Ipv6: DestinationUnreachable | PacketTooBig
                                      | TimeExceeded | ParameterProblem |\n\t\t\t
                                      EchoRequest | EchoReply | MulticastListenerQuery|
                                      MulticastListenerReport |\n\t\t\t MulticastListenerDone
                                      | RouterSolicitation | RouterAdvertisement
                                      | NeighborSolicitation |\n\t\t\t NeighborAdvertisement
                                      | RedirectMessage | RouterRenumbering | ICMPNodeInformationQuery
                                      |\n\t\t\t ICMPNodeInformationResponse | InverseNeighborDiscoverySolicitation
                                      | InverseNeighborDiscoveryAdvertisement |\n\t\t\t
                                      HomeAgentAddressDiscoveryRequest | HomeAgentAddressDiscoveryReply
                                      | MobilePrefixSolicitation |\n\t\t\t MobilePrefixAdvertisement
                                      | DuplicateAddressRequestCodeSuffix | DuplicateAddressConfirmationCodeSuffix
                                      |\n\t\t\t ExtendedEchoRequest | ExtendedEchoReply"
                                    pattern: ^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]|EchoReply|DestinationUnreachable|Redirect|Echo|RouterAdvertisement|RouterSelection|TimeExceeded|ParameterProblem|Timestamp|TimestampReply|Photuris|ExtendedEchoRequest|ExtendedEcho
                                      Reply|PacketTooBig|ParameterProblem|EchoRequest|MulticastListenerQuery|MulticastListenerReport|MulticastListenerDone|RouterSolicitation|RouterAdvertisement|NeighborSolicitation|NeighborAdvertisement|RedirectMessage|RouterRenumbering|ICMPNodeInformationQuery|ICMPNodeInformationResponse|InverseNeighborDiscoverySolicitation|InverseNeighborDiscoveryAdvertisement|HomeAgentAddressDiscoveryRequest|HomeAgentAddressDiscoveryReply|MobilePrefixSolicitation|MobilePrefixAdvertisement|DuplicateAddressRequestCodeSuffix|DuplicateAddressConfirmationCodeSuffix)$
                                    x-kubernetes-int-or-string: true
                                required:
                                - type
                                type: object
                              maxItems: 40
                              type: array
                          type: object
                        type: array
                      toPorts:
                        description: |-
                          ToPorts is a list of destination ports identified by port number and
                          protocol which the endpoint subject to the rule is not allowed to
                          receive connections on.

                          Example:
                          Any endpoint with the label "app=httpd" can not accept incoming
                          connections on port 80/tcp.
                        items:
                          description: |-
                            PortDenyRule is a list of ports/protocol that should be used for deny
                            policies. This structure lacks the L7Rules since it's not supported in deny
                            policies.
                          properties:
                            ports:
                              description: Ports is a list of L4 port/protocol
                              items:
                                description: PortProtocol specifies an L4 port with
                                  an optional transport protocol
                                properties:
                                  endPort:
                                    description: EndPort can only be an L4 port
                                      number.
                                    format: int32
                                    maximum: 65535
                                    minimum: 0
                                    type: integer
                                  port:
                                    description: |-
                                      Port can be an L4 port number, or a name in the form of "http"
                                      or "http-8080".
                                    pattern: ^(6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[0-9]{1,4})|([a-zA-Z0-9]-?)*[a-zA-Z](-?[a-zA-Z0-9])*$
                                    type: string
                                  protocol:
                                    description: |-
                                      Protocol is the L4 protocol. If omitted or empty, any protocol
                                      matches. Accepted values: "TCP", "UDP", "SCTP", "ANY"

                                      Matching on ICMP is not supported.

                                      Named port specified for a container may narrow this down, but may not
                                      contradict this.
                                    enum:
                                    - TCP
                                    - UDP
                                    - SCTP
                                    - ANY
                                    type: string
                                required:
                                - port
                                type: object
                              type: array
                          type: object
                        type: array
                    type: object
                  type: array
                labels:
                  description: |-
                    Labels is a list of optional strings which can be used to
                    re-identify the rule or to store metadata. It is possible to lookup
                    or delete strings based on labels. Labels are not required to be
                    unique, multiple rules can have overlapping or identical labels.
                  items:
                    description: Label is the Cilium's representation of a container
                      label.
                    properties:
                      key:
                        type: string
                      source:
                        description: 'Source can be one of the above values (e.g.:
                          LabelSourceContainer).'
                        type: string
                      value:
                        type: string
                    required:
                    - key
                    type: object
                  type: array
                nodeSelector:
                  description: |-
                    NodeSelector selects all nodes which should be subject to this rule.
                    EndpointSelector and NodeSelector cannot be both empty and are mutually
                    exclusive. Can only be used in CiliumClusterwideNetworkPolicies.
                  properties:
                    matchExpressions:
                      description: matchExpressions is a list of label selector
                        requirements. The requirements are ANDed.
                      items:
                        description: |-
                          A label selector requirement is a selector that contains values, a key, and an operator that
                          relates the key and values.
                        properties:
                          key:
                            description: key is the label key that the selector
                              applies to.
                            type: string
                          operator:
                            description: |-
                              operator represents a key's relationship to a set of values.
                              Valid operators are In, NotIn, Exists and DoesNotExist.
                            enum:
                            - In
                            - NotIn
                            - Exists
                            - DoesNotExist
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
                        description: MatchLabelsValue represents the value from
                          the MatchLabels {key,value} pair.
                        maxLength: 63
                        pattern: ^(([A-Za-z0-9][-A-Za-z0-9_.]*)?[A-Za-z0-9])?$
                        type: string
                      description: |-
                        matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels
                        map is equivalent to an element of matchExpressions, whose key field is "key", the
                        operator is "In", and the values array contains only "value". The requirements are ANDed.
                      type: object
                  type: object
                  x-kubernetes-map-type: atomic
              type: object
            type: array
          status:
            description: Status is the status of the Cilium policy rule
            properties:
              conditions:
                items:
                  properties:
                    lastTransitionTime:
                      description: The last time the condition transitioned from
                        one status to another.
                      format: date-time
                      type: string
                    message:
                      description: A human readable message indicating details about
                        the transition.
                      type: string
                    reason:
                      description: The reason for the condition's last transition.
                      type: string
                    status:
                      description: The status of the condition, one of True, False,
                        or Unknown
                      type: string
                    type:
                      description: The type of the policy condition
                      type: string
                  required:
                  - status
                  - type
                  type: object
                type: array
                x-kubernetes-list-map-keys:
                - type
                x-kubernetes-list-type: map
              derivativePolicies:
                additionalProperties:
                  description: |-
                    CiliumNetworkPolicyNodeStatus is the status of a Cilium policy rule for a
                    specific node.
                  properties:
                    annotations:
                      additionalProperties:
                        type: string
                      description: |-
                        Annotations corresponds to the Annotations in the ObjectMeta of the CNP
                        that have been realized on the node for CNP. That is, if a CNP has been
                        imported and has been assigned annotation X=Y by the user,
                        Annotations in CiliumNetworkPolicyNodeStatus will be X=Y once the
                        CNP that was imported corresponding to Annotation X=Y has been realized on
                        the node.
                      type: object
                    enforcing:
                      description: |-
                        Enforcing is set to true once all endpoints present at the time the
                        policy has been imported are enforcing this policy.
                      type: boolean
                    error:
                      description: |-
                        Error describes any error that occurred when parsing or importing the
                        policy, or realizing the policy for the endpoints to which it applies
                        on the node.
                      type: string
                    lastUpdated:
                      description: LastUpdated contains the last time this status
                        was updated
                      format: date-time
                      type: string
                    localPolicyRevision:
                      description: |-
                        Revision is the policy revision of the repository which first implemented
                        this policy.
                      format: int64
                      type: integer
                    ok:
                      description: |-
                        OK is true when the policy has been parsed and imported successfully
                        into the in-memory policy repository on the node.
                      type: boolean
                  type: object
                description: |-
                  DerivativePolicies is the status of all policies derived from the Cilium
                  policy
                type: object
            type: object
        required:
        - metadata
        type: object
    served: true
    storage: true
    subresources:
      status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  labels:
    io.cilium.k8s.crd.schema.version: 1.30.8
  name: ciliumnodeconfigs.cilium.io
spec:
  conversion:
    strategy: None
  group: cilium.io
  names:
    categories:
    - cilium
    kind: CiliumNodeConfig
    listKind: CiliumNodeConfigList
    plural: ciliumnodeconfigs
    singular: ciliumnodeconfig
  scope: Namespaced
  versions:
  - name: v2
    schema:
      openAPIV3Schema:
        description: |-
          CiliumNodeConfig is a list of configuration key-value pairs. It is applied to
          nodes indicated by a label selector.

          If multiple overrides apply to the same node, they will be ordered by name
          with later Overrides overwriting any conflicting keys.
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
            description: Spec is the desired Cilium configuration overrides for
              a given node
            properties:
              defaults:
                additionalProperties:
                  type: string
                description: |-
                  Defaults is treated the same as the cilium-config ConfigMap - a set
                  of key-value pairs parsed by the agent and operator processes.
                  Each key must be a valid config-map data field (i.e. a-z, A-Z, -, _, and .)
                type: object
              nodeSelector:
                description: |-
                  NodeSelector is a label selector that determines to which nodes
                  this configuration applies.
                  If not supplied, then this config applies to no nodes. If
                  empty, then it applies to all nodes.
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
            required:
            - defaults
            - nodeSelector
            type: object
        required:
        - spec
        type: object
    served: true
    storage: true
  - deprecated: true
    deprecationWarning: cilium.io/v2alpha1 CiliumNodeConfig will be deprecated in
      cilium v1.16; use cilium.io/v2 CiliumNodeConfig
    name: v2alpha1
    schema:
      openAPIV3Schema:
        description: |-
          CiliumNodeConfig is a list of configuration key-value pairs. It is applied to
          nodes indicated by a label selector.

          If multiple overrides apply to the same node, they will be ordered by name
          with later Overrides overwriting any conflicting keys.
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
            description: Spec is the desired Cilium configuration overrides for
              a given node
            properties:
              defaults:
                additionalProperties:
                  type: string
                description: |-
                  Defaults is treated the same as the cilium-config ConfigMap - a set
                  of key-value pairs parsed by the agent and operator processes.
                  Each key must be a valid config-map data field (i.e. a-z, A-Z, -, _, and .)
                type: object
              nodeSelector:
                description: |-
                  NodeSelector is a label selector that determines to which nodes
                  this configuration applies.
                  If not supplied, then this config applies to no nodes. If
                  empty, then it applies to all nodes.
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
            required:
            - defaults
            - nodeSelector
            type: object
        required:
        - spec
        type: object
    served: true
    storage: false
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  labels:
    io.cilium.k8s.crd.schema.version: 1.30.8
  name: ciliumnodes.cilium.io
spec:
  conversion:
    strategy: None
  group: cilium.io
  names:
    categories:
    - cilium
    kind: CiliumNode
    listKind: CiliumNodeList
    plural: ciliumnodes
    shortNames:
    - cn
    - ciliumn
    singular: ciliumnode
  scope: Cluster
  versions:
  - additionalPrinterColumns:
    - description: Cilium internal IP for this node
      jsonPath: .spec.addresses[?(@.type=="CiliumInternalIP")].ip
      name: CiliumInternalIP
      type: string
    - description: IP of the node
      jsonPath: .spec.addresses[?(@.type=="InternalIP")].ip
      name: InternalIP
      type: string
    - description: Time duration since creation of Ciliumnode
      jsonPath: .metadata.creationTimestamp
      name: Age
      type: date
    name: v2
    schema:
      openAPIV3Schema:
        description: |-
          CiliumNode represents a node managed by Cilium. It contains a specification
          to control various node specific configuration aspects and a status section
          to represent the status of the node.
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
            description: Spec defines the desired specification/configuration of
              the node.
            properties:
              addresses:
                description: Addresses is the list of all node addresses.
                items:
                  description: NodeAddress is a node address.
                  properties:
                    ip:
                      description: IP is an IP of a node
                      type: string
                    type:
                      description: Type is the type of the node address
                      type: string
                  type: object
                type: array
              alibaba-cloud:
                description: AlibabaCloud is the AlibabaCloud IPAM specific configuration.
                properties:
                  availability-zone:
                    description: |-
                      AvailabilityZone is the availability zone to use when allocating
                      ENIs.
                    type: string
                  cidr-block:
                    description: CIDRBlock is vpc ipv4 CIDR
                    type: string
                  instance-type:
                    description: InstanceType is the ECS instance type, e.g. "ecs.g6.2xlarge"
                    type: string
                  security-group-tags:
                    additionalProperties:
                      type: string
                    description: |-
                      SecurityGroupTags is the list of tags to use when evaluating which
                      security groups to use for the ENI.
                    type: object
                  security-groups:
                    description: |-
                      SecurityGroups is the list of security groups to attach to any ENI
                      that is created and attached to the instance.
                    items:
                      type: string
                    type: array
                  vpc-id:
                    description: VPCID is the VPC ID to use when allocating ENIs.
                    type: string
                  vswitch-tags:
                    additionalProperties:
                      type: string
                    description: |-
                      VSwitchTags is the list of tags to use when evaluating which
                      vSwitch to use for the ENI.
                    type: object
                  vswitches:
                    description: VSwitches is the ID of vSwitch available for ENI
                    items:
                      type: string
                    type: array
                type: object
              azure:
                description: Azure is the Azure IPAM specific configuration.
                properties:
                  interface-name:
                    description: |-
                      InterfaceName is the name of the interface the cilium-operator
                      will use to allocate all the IPs on
                    type: string
                type: object
              bootid:
                description: BootID is a unique node identifier generated on boot
                type: string
              encryption:
                description: Encryption is the encryption configuration of the node.
                properties:
                  key:
                    description: |-
                      Key is the index to the key to use for encryption or 0 if encryption is
                      disabled.
                    type: integer
                type: object
              eni:
                description: ENI is the AWS ENI specific configuration.
                properties:
                  availability-zone:
                    description: |-
                      AvailabilityZone is the availability zone to use when allocating
                      ENIs.
                    type: string
                  delete-on-termination:
                    description: |-
                      DeleteOnTermination defines that the ENI should be deleted when the
                      associated instance is terminated. If the parameter is not set the
                      default behavior is to delete the ENI on instance termination.
                    type: boolean
                  disable-prefix-delegation:
                    description: |-
                      DisablePrefixDelegation determines whether ENI prefix delegation should be
                      disabled on this node.
                    type: boolean
                  exclude-interface-tags:
                    additionalProperties:
                      type: string
                    description: |-
                      ExcludeInterfaceTags is the list of tags to use when excluding ENIs for
                      Cilium IP allocation. Any interface matching this set of tags will not
                      be managed by Cilium.
                    type: object
                  first-interface-index:
                    description: |-
                      FirstInterfaceIndex is the index of the first ENI to use for IP
                      allocation, e.g. if the node has eth0, eth1, eth2 and
                      FirstInterfaceIndex is set to 1, then only eth1 and eth2 will be
                      used for IP allocation, eth0 will be ignored for PodIP allocation.
                    minimum: 0
                    type: integer
                  instance-id:
                    description: |-
                      InstanceID is the AWS InstanceId of the node. The InstanceID is used
                      to retrieve AWS metadata for the node.

                      OBSOLETE: This field is obsolete, please use Spec.InstanceID
                    type: string
                  instance-type:
                    description: InstanceType is the AWS EC2 instance type, e.g.
                      "m5.large"
                    type: string
                  max-above-watermark:
                    description: |-
                      MaxAboveWatermark is the maximum number of addresses to allocate
                      beyond the addresses needed to reach the PreAllocate watermark.
                      Going above the watermark can help reduce the number of API calls to
                      allocate IPs, e.g. when a new ENI is allocated, as many secondary
                      IPs as possible are allocated. Limiting the amount can help reduce
                      waste of IPs.

                      OBSOLETE: This field is obsolete, please use Spec.IPAM.MaxAboveWatermark
                    minimum: 0
                    type: integer
                  min-allocate:
                    description: |-
                      MinAllocate is the minimum number of IPs that must be allocated when
                      the node is first bootstrapped. It defines the minimum base socket
                      of addresses that must be available. After reaching this watermark,
                      the PreAllocate and MaxAboveWatermark logic takes over to continue
                      allocating IPs.

                      OBSOLETE: This field is obsolete, please use Spec.IPAM.MinAllocate
                    minimum: 0
                    type: integer
                  node-subnet-id:
                    description: |-
                      NodeSubnetID is the subnet of the primary ENI the instance was brought up
                      with. It is used as a sensible default subnet to create ENIs in.
                    type: string
                  pre-allocate:
                    description: |-
                      PreAllocate defines the number of IP addresses that must be
                      available for allocation in the IPAMspec. It defines the buffer of
                      addresses available immediately without requiring cilium-operator to
                      get involved.

                      OBSOLETE: This field is obsolete, please use Spec.IPAM.PreAllocate
                    minimum: 0
                    type: integer
                  security-group-tags:
                    additionalProperties:
                      type: string
                    description: |-
                      SecurityGroupTags is the list of tags to use when evaliating what
                      AWS security groups to use for the ENI.
                    type: object
                  security-groups:
                    description: |-
                      SecurityGroups is the list of security groups to attach to any ENI
                      that is created and attached to the instance.
                    items:
                      type: string
                    type: array
                  subnet-ids:
                    description: |-
                      SubnetIDs is the list of subnet ids to use when evaluating what AWS
                      subnets to use for ENI and IP allocation.
                    items:
                      type: string
                    type: array
                  subnet-tags:
                    additionalProperties:
                      type: string
                    description: |-
                      SubnetTags is the list of tags to use when evaluating what AWS
                      subnets to use for ENI and IP allocation.
                    type: object
                  use-primary-address:
                    description: |-
                      UsePrimaryAddress determines whether an ENI's primary address
                      should be available for allocations on the node
                    type: boolean
                  vpc-id:
                    description: VpcID is the VPC ID to use when allocating ENIs.
                    type: string
                type: object
              health:
                description: |-
                  HealthAddressing is the addressing information for health connectivity
                  checking.
                properties:
                  ipv4:
                    description: IPv4 is the IPv4 address of the IPv4 health endpoint.
                    type: string
                  ipv6:
                    description: IPv6 is the IPv6 address of the IPv4 health endpoint.
                    type: string
                type: object
              ingress:
                description: IngressAddressing is the addressing information for
                  Ingress listener.
                properties:
                  ipv4:
                    type: string
                  ipv6:
                    type: string
                type: object
              instance-id:
                description: |-
                  InstanceID is the identifier of the node. This is different from the
                  node name which is typically the FQDN of the node. The InstanceID
                  typically refers to the identifier used by the cloud provider or
                  some other means of identification.
                type: string
              ipam:
                description: |-
                  IPAM is the address management specification. This section can be
                  populated by a user or it can be automatically populated by an IPAM
                  operator.
                properties:
                  ipv6-pool:
                    additionalProperties:
                      description: |-
                        AllocationIP is an IP which is available for allocation, or already
                        has been allocated
                      properties:
                        owner:
                          description: |-
                            Owner is the owner of the IP. This field is set if the IP has been
                            allocated. It will be set to the pod name or another identifier
                            representing the usage of the IP

                            The owner field is left blank for an entry in Spec.IPAM.Pool and
                            filled out as the IP is used and also added to Status.IPAM.Used.
                          type: string
                        resource:
                          description: |-
                            Resource is set for both available and allocated IPs, it represents
                            what resource the IP is associated with, e.g. in combination with
                            AWS ENI, this will refer to the ID of the ENI
                          type: string
                      type: object
                    description: |-
                      IPv6Pool is the list of IPv6 addresses available to the node for allocation.
                      When an IPv6 address is used, it will remain on this list but will be added to
                      Status.IPAM.IPv6Used
                    type: object
                  max-above-watermark:
                    description: |-
                      MaxAboveWatermark is the maximum number of addresses to allocate
                      beyond the addresses needed to reach the PreAllocate watermark.
                      Going above the watermark can help reduce the number of API calls to
                      allocate IPs, e.g. when a new ENI is allocated, as many secondary
                      IPs as possible are allocated. Limiting the amount can help reduce
                      waste of IPs.
                    minimum: 0
                    type: integer
                  max-allocate:
                    description: |-
                      MaxAllocate is the maximum number of IPs that can be allocated to the
                      node. When the current amount of allocated IPs will approach this value,
                      the considered value for PreAllocate will decrease down to 0 in order to
                      not attempt to allocate more addresses than defined.
                    minimum: 0
                    type: integer
                  min-allocate:
                    description: |-
                      MinAllocate is the minimum number of IPs that must be allocated when
                      the node is first bootstrapped. It defines the minimum base socket
                      of addresses that must be available. After reaching this watermark,
                      the PreAllocate and MaxAboveWatermark logic takes over to continue
                      allocating IPs.
                    minimum: 0
                    type: integer
                  podCIDRs:
                    description: |-
                      PodCIDRs is the list of CIDRs available to the node for allocation.
                      When an IP is used, the IP will be added to Status.IPAM.Used
                    items:
                      type: string
                    type: array
                  pool:
                    additionalProperties:
                      description: |-
                        AllocationIP is an IP which is available for allocation, or already
                        has been allocated
                      properties:
                        owner:
                          description: |-
                            Owner is the owner of the IP. This field is set if the IP has been
                            allocated. It will be set to the pod name or another identifier
                            representing the usage of the IP

                            The owner field is left blank for an entry in Spec.IPAM.Pool and
                            filled out as the IP is used and also added to Status.IPAM.Used.
                          type: string
                        resource:
                          description: |-
                            Resource is set for both available and allocated IPs, it represents
                            what resource the IP is associated with, e.g. in combination with
                            AWS ENI, this will refer to the ID of the ENI
                          type: string
                      type: object
                    description: |-
                      Pool is the list of IPv4 addresses available to the node for allocation.
                      When an IPv4 address is used, it will remain on this list but will be added to
                      Status.IPAM.Used
                    type: object
                  pools:
                    description: Pools contains the list of assigned IPAM pools
                      for this node.
                    properties:
                      allocated:
                        description: |-
                          Allocated contains the list of pooled CIDR assigned to this node. The
                          operator will add new pod CIDRs to this field, whereas the agent will
                          remove CIDRs it has released.
                        items:
                          description: |-
                            IPAMPoolAllocation describes an allocation of an IPAM pool from the operator to the
                            node. It contains the assigned PodCIDRs allocated from this pool
                          properties:
                            cidrs:
                              description: CIDRs contains a list of pod CIDRs currently
                                allocated from this pool
                              items:
                                description: IPAMPodCIDR is a pod CIDR
                                format: cidr
                                type: string
                              type: array
                            pool:
                              description: Pool is the name of the IPAM pool backing
                                this allocation
                              minLength: 1
                              type: string
                          required:
                          - pool
                          type: object
                        type: array
                      requested:
                        description: |-
                          Requested contains a list of IPAM pool requests, i.e. indicates how many
                          addresses this node requests out of each pool listed here. This field
                          is owned and written to by cilium-agent and read by the operator.
                        items:
                          properties:
                            needed:
                              description: |-
                                Needed indicates how many IPs out of the above Pool this node requests
                                from the operator. The operator runs a reconciliation loop to ensure each
                                node always has enough PodCIDRs allocated in each pool to fulfill the
                                requested number of IPs here.
                              properties:
                                ipv4-addrs:
                                  description: |-
                                    IPv4Addrs contains the number of requested IPv4 addresses out of a given
                                    pool
                                  type: integer
                                ipv6-addrs:
                                  description: |-
                                    IPv6Addrs contains the number of requested IPv6 addresses out of a given
                                    pool
                                  type: integer
                              type: object
                            pool:
                              description: Pool is the name of the IPAM pool backing
                                this request
                              minLength: 1
                              type: string
                          required:
                          - pool
                          type: object
                        type: array
                    type: object
                  pre-allocate:
                    description: |-
                      PreAllocate defines the number of IP addresses that must be
                      available for allocation in the IPAMspec. It defines the buffer of
                      addresses available immediately without requiring cilium-operator to
                      get involved.
                    minimum: 0
                    type: integer
                  static-ip-tags:
                    additionalProperties:
                      type: string
                    description: |-
                      StaticIPTags are used to determine the pool of IPs from which to
                      attribute a static IP to the node. For example in AWS this is used to
                      filter Elastic IP Addresses.
                    type: object
                type: object
              nodeidentity:
                description: NodeIdentity is the Cilium numeric identity allocated
                  for the node, if any.
                format: int64
                type: integer
            type: object
          status:
            description: |-
              Status defines the realized specification/configuration and status
              of the node.
            properties:
              alibaba-cloud:
                description: AlibabaCloud is the AlibabaCloud specific status of
                  the node.
                properties:
                  enis:
                    additionalProperties:
                      description: ENI represents an AlibabaCloud Elastic Network
                        Interface
                      properties:
                        instance-id:
                          description: InstanceID is the InstanceID using this ENI
                          type: string
                        mac-address:
                          description: MACAddress is the mac address of the ENI
                          type: string
                        network-interface-id:
                          description: NetworkInterfaceID is the ENI id
                          type: string
                        primary-ip-address:
                          description: PrimaryIPAddress is the primary IP on ENI
                          type: string
                        private-ipsets:
                          description: PrivateIPSets is the list of all IPs on the
                            ENI, including PrimaryIPAddress
                          items:
                            description: PrivateIPSet is a nested struct in ecs
                              response
                            properties:
                              primary:
                                type: boolean
                              private-ip-address:
                                type: string
                            type: object
                          type: array
                        security-groupids:
                          description: SecurityGroupIDs is the security group ids
                            used by this ENI
                          items:
                            type: string
                          type: array
                        tags:
                          additionalProperties:
                            type: string
                          description: Tags is the tags on this ENI
                          type: object
                        type:
                          description: Type is the ENI type Primary or Secondary
                          type: string
                        vpc:
                          description: VPC is the vpc to which the ENI belongs
                          properties:
                            cidr:
                              description: CIDRBlock is the VPC IPv4 CIDR
                              type: string
                            ipv6-cidr:
                              description: IPv6CIDRBlock is the VPC IPv6 CIDR
                              type: string
                            secondary-cidrs:
                              description: SecondaryCIDRs is the list of Secondary
                                CIDRs associated with the VPC
                              items:
                                type: string
                              type: array
                            vpc-id:
                              description: VPCID is the vpc to which the ENI belongs
                              type: string
                          type: object
                        vswitch:
                          description: VSwitch is the vSwitch the ENI is using
                          properties:
                            cidr:
                              description: CIDRBlock is the vSwitch IPv4 CIDR
                              type: string
                            ipv6-cidr:
                              description: IPv6CIDRBlock is the vSwitch IPv6 CIDR
                              type: string
                            vswitch-id:
                              description: VSwitchID is the vSwitch to which the
                                ENI belongs
                              type: string
                          type: object
                        zone-id:
                          description: ZoneID is the zone to which the ENI belongs
                          type: string
                      type: object
                    description: ENIs is the list of ENIs on the node
                    type: object
                type: object
              azure:
                description: Azure is the Azure specific status of the node.
                properties:
                  interfaces:
                    description: Interfaces is the list of interfaces on the node
                    items:
                      description: AzureInterface represents an Azure Interface
                      properties:
                        GatewayIP:
                          description: |-
                            GatewayIP is the interface's subnet's default route

                            OBSOLETE: This field is obsolete, please use Gateway field instead.
                          type: string
                        addresses:
                          description: |-
                            Addresses is the list of all IPs associated with the interface,
                            including all secondary addresses
                          items:
                            description: AzureAddress is an IP address assigned
                              to an AzureInterface
                            properties:
                              ip:
                                description: IP is the ip address of the address
                                type: string
                              state:
                                description: State is the provisioning state of
                                  the address
                                type: string
                              subnet:
                                description: Subnet is the subnet the address belongs
                                  to
                                type: string
                            type: object
                          type: array
                        cidr:
                          description: CIDR is the range that the interface belongs
                            to.
                          type: string
                        gateway:
                          description: Gateway is the interface's subnet's default
                            route
                          type: string
                        id:
                          description: ID is the identifier
                          type: string
                        mac:
                          description: MAC is the mac address
                          type: string
                        name:
                          description: Name is the name of the interface
                          type: string
                        security-group:
                          description: SecurityGroup is the security group associated
                            with the interface
                          type: string
                        state:
                          description: State is the provisioning state
                          type: string
                      type: object
                    type: array
                type: object
              eni:
                description: ENI is the AWS ENI specific status of the node.
                properties:
                  enis:
                    additionalProperties:
                      description: |-
                        ENI represents an AWS Elastic Network Interface

                        More details:
                        https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-eni.html
                      properties:
                        addresses:
                          description: Addresses is the list of all secondary IPs
                            associated with the ENI
                          items:
                            type: string
                          type: array
                        availability-zone:
                          description: AvailabilityZone is the availability zone
                            of the ENI
                          type: string
                        description:
                          description: Description is the description field of the
                            ENI
                          type: string
                        id:
                          description: ID is the ENI ID
                          type: string
                        ip:
                          description: IP is the primary IP of the ENI
                          type: string
                        mac:
                          description: MAC is the mac address of the ENI
                          type: string
                        number:
                          description: |-
                            Number is the interface index, it used in combination with
                            FirstInterfaceIndex
                          type: integer
                        prefixes:
                          description: Prefixes is the list of all /28 prefixes
                            associated with the ENI
                          items:
                            type: string
                          type: array
                        public-ip:
                          description: PublicIP is the public IP associated with
                            the ENI
                          type: string
                        security-groups:
                          description: SecurityGroups are the security groups associated
                            with the ENI
                          items:
                            type: string
                          type: array
                        subnet:
                          description: Subnet is the subnet the ENI is associated
                            with
                          properties:
                            cidr:
                              description: CIDR is the CIDR range associated with
                                the subnet
                              type: string
                            id:
                              description: ID is the ID of the subnet
                              type: string
                          type: object
                        tags:
                          additionalProperties:
                            type: string
                          description: |-
                            Tags is the set of tags of the ENI. Used to detect ENIs which should
                            not be managed by Cilium
                          type: object
                        vpc:
                          description: VPC is the VPC information to which the ENI
                            is attached to
                          properties:
                            cidrs:
                              description: CIDRs is the list of CIDR ranges associated
                                with the VPC
                              items:
                                type: string
                              type: array
                            id:
                              description: / ID is the ID of a VPC
                              type: string
                            primary-cidr:
                              description: PrimaryCIDR is the primary CIDR of the
                                VPC
                              type: string
                          type: object
                      type: object
                    description: ENIs is the list of ENIs on the node
                    type: object
                type: object
              ipam:
                description: IPAM is the IPAM status of the node.
                properties:
                  assigned-static-ip:
                    description: 'AssignedStaticIP is the static IP assigned to
                      the node (ex: public Elastic IP address in AWS)'
                    type: string
                  ipv6-used:
                    additionalProperties:
                      description: |-
                        AllocationIP is an IP which is available for allocation, or already
                        has been allocated
                      properties:
                        owner:
                          description: |-
                            Owner is the owner of the IP. This field is set if the IP has been
                            allocated. It will be set to the pod name or another identifier
                            representing the usage of the IP

                            The owner field is left blank for an entry in Spec.IPAM.Pool and
                            filled out as the IP is used and also added to Status.IPAM.Used.
                          type: string
                        resource:
                          description: |-
                            Resource is set for both available and allocated IPs, it represents
                            what resource the IP is associated with, e.g. in combination with
                            AWS ENI, this will refer to the ID of the ENI
                          type: string
                      type: object
                    description: |-
                      IPv6Used lists all IPv6 addresses out of Spec.IPAM.IPv6Pool which have been
                      allocated and are in use.
                    type: object
                  operator-status:
                    description: Operator is the Operator status of the node
                    properties:
                      error:
                        description: Error is the error message set by cilium-operator.
                        type: string
                    type: object
                  pod-cidrs:
                    additionalProperties:
                      properties:
                        status:
                          description: Status describes the status of a pod CIDR
                          enum:
                          - released
                          - depleted
                          - in-use
                          type: string
                      type: object
                    description: PodCIDRs lists the status of each pod CIDR allocated
                      to this node.
                    type: object
                  release-ips:
                    additionalProperties:
                      description: IPReleaseStatus defines the valid states in IP
                        release handshake
                      enum:
                      - marked-for-release
                      - ready-for-release
                      - do-not-release
                      - released
                      type: string
                    description: |-
                      ReleaseIPs tracks the state for every IPv4 address considered for release.
                      The value can be one of the following strings:
                      * marked-for-release : Set by operator as possible candidate for IP
                      * ready-for-release  : Acknowledged as safe to release by agent
                      * do-not-release     : IP already in use / not owned by the node. Set by agent
                      * released           : IP successfully released. Set by operator
                    type: object
                  release-ipv6s:
                    additionalProperties:
                      description: IPReleaseStatus defines the valid states in IP
                        release handshake
                      enum:
                      - marked-for-release
                      - ready-for-release
                      - do-not-release
                      - released
                      type: string
                    description: |-
                      ReleaseIPv6s tracks the state for every IPv6 address considered for release.
                      The value can be one of the following strings:
                      * marked-for-release : Set by operator as possible candidate for IP
                      * ready-for-release  : Acknowledged as safe to release by agent
                      * do-not-release     : IP already in use / not owned by the node. Set by agent
                      * released           : IP successfully released. Set by operator
                    type: object
                  used:
                    additionalProperties:
                      description: |-
                        AllocationIP is an IP which is available for allocation, or already
                        has been allocated
                      properties:
                        owner:
                          description: |-
                            Owner is the owner of the IP. This field is set if the IP has been
                            allocated. It will be set to the pod name or another identifier
                            representing the usage of the IP

                            The owner field is left blank for an entry in Spec.IPAM.Pool and
                            filled out as the IP is used and also added to Status.IPAM.Used.
                          type: string
                        resource:
                          description: |-
                            Resource is set for both available and allocated IPs, it represents
                            what resource the IP is associated with, e.g. in combination with
                            AWS ENI, this will refer to the ID of the ENI
                          type: string
                      type: object
                    description: |-
                      Used lists all IPv4 addresses out of Spec.IPAM.Pool which have been allocated
                      and are in use.
                    type: object
                type: object
            type: object
        required:
        - metadata
        - spec
        type: object
    served: true
    storage: true
    subresources:
      status: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  labels:
    io.cilium.k8s.crd.schema.version: 1.30.8
  name: ciliumpodippools.cilium.io
spec:
  conversion:
    strategy: None
  group: cilium.io
  names:
    categories:
    - cilium
    kind: CiliumPodIPPool
    listKind: CiliumPodIPPoolList
    plural: ciliumpodippools
    shortNames:
    - cpip
    singular: ciliumpodippool
  scope: Cluster
  versions:
  - name: v2alpha1
    schema:
      openAPIV3Schema:
        description: |-
          CiliumPodIPPool defines an IP pool that can be used for pooled IPAM (i.e. the multi-pool IPAM
          mode).
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
              ipv4:
                description: IPv4 specifies the IPv4 CIDRs and mask sizes of the
                  pool
                properties:
                  cidrs:
                    description: CIDRs is a list of IPv4 CIDRs that are part of
                      the pool.
                    items:
                      description: PoolCIDR is an IP pool CIDR.
                      format: cidr
                      type: string
                    minItems: 1
                    type: array
                  maskSize:
                    description: MaskSize is the mask size of the pool.
                    maximum: 32
                    minimum: 1
                    type: integer
                required:
                - cidrs
                - maskSize
                type: object
              ipv6:
                description: IPv6 specifies the IPv6 CIDRs and mask sizes of the
                  pool
                properties:
                  cidrs:
                    description: CIDRs is a list of IPv6 CIDRs that are part of
                      the pool.
                    items:
                      description: PoolCIDR is an IP pool CIDR.
                      format: cidr
                      type: string
                    minItems: 1
                    type: array
                  maskSize:
                    description: MaskSize is the mask size of the pool.
                    maximum: 128
                    minimum: 1
                    type: integer
                required:
                - cidrs
                - maskSize
                type: object
            type: object
        required:
        - spec
        type: object
    served: true
    storage: true

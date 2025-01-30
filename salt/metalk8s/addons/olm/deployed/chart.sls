#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}

{% raw %}
apiVersion: v1
kind: Namespace
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/enforce-version: latest
  name: olmv1-system
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.16.1
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: clusterextensions.olm.operatorframework.io
spec:
  group: olm.operatorframework.io
  names:
    kind: ClusterExtension
    listKind: ClusterExtensionList
    plural: clusterextensions
    singular: clusterextension
  scope: Cluster
  versions:
  - additionalPrinterColumns:
    - jsonPath: .status.install.bundle.name
      name: Installed Bundle
      type: string
    - jsonPath: .status.install.bundle.version
      name: Version
      type: string
    - jsonPath: .status.conditions[?(@.type=='Installed')].status
      name: Installed
      type: string
    - jsonPath: .status.conditions[?(@.type=='Progressing')].status
      name: Progressing
      type: string
    - jsonPath: .metadata.creationTimestamp
      name: Age
      type: date
    name: v1
    schema:
      openAPIV3Schema:
        description: ClusterExtension is the Schema for the clusterextensions API
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
            description: spec is an optional field that defines the desired state
              of the ClusterExtension.
            properties:
              install:
                description: |-
                  install is an optional field used to configure the installation options
                  for the ClusterExtension such as the pre-flight check configuration.
                properties:
                  preflight:
                    description: |-
                      preflight is an optional field that can be used to configure the checks that are
                      run before installation or upgrade of the content for the package specified in the packageName field.
                      When specified, it replaces the default preflight configuration for install/upgrade actions.
                      When not specified, the default configuration will be used.
                    properties:
                      crdUpgradeSafety:
                        description: |-
                          crdUpgradeSafety is used to configure the CRD Upgrade Safety pre-flight
                          checks that run prior to upgrades of installed content.
                          The CRD Upgrade Safety pre-flight check safeguards from unintended
                          consequences of upgrading a CRD, such as data loss.
                        properties:
                          enforcement:
                            description: |-
                              enforcement is a required field, used to configure the state of the CRD Upgrade Safety pre-flight check.
                              Allowed values are "None" or "Strict". The default value is "Strict".
                              When set to "None", the CRD Upgrade Safety pre-flight check will be skipped
                              when performing an upgrade operation. This should be used with caution as
                              unintended consequences such as data loss can occur.
                              When set to "Strict", the CRD Upgrade Safety pre-flight check will be run when
                              performing an upgrade operation.
                            enum:
                            - None
                            - Strict
                            type: string
                        required:
                        - enforcement
                        type: object
                    required:
                    - crdUpgradeSafety
                    type: object
                    x-kubernetes-validations:
                    - message: at least one of [crdUpgradeSafety] are required when
                        preflight is specified
                      rule: has(self.crdUpgradeSafety)
                type: object
                x-kubernetes-validations:
                - message: at least one of [preflight] are required when install is
                    specified
                  rule: has(self.preflight)
              namespace:
                description: |-
                  namespace is a reference to a Kubernetes namespace.
                  This is the namespace in which the provided ServiceAccount must exist.
                  It also designates the default namespace where namespace-scoped resources
                  for the extension are applied to the cluster.
                  Some extensions may contain namespace-scoped resources to be applied in other namespaces.
                  This namespace must exist.
                  namespace is required, immutable, and follows the DNS label standard
                  as defined in [RFC 1123]. It must contain only lowercase alphanumeric characters or hyphens (-),
                  start and end with an alphanumeric character, and be no longer than 63 characters
                  [RFC 1123]: https://tools.ietf.org/html/rfc1123
                maxLength: 63
                type: string
                x-kubernetes-validations:
                - message: namespace is immutable
                  rule: self == oldSelf
                - message: namespace must be a valid DNS1123 label
                  rule: self.matches("^[a-z0-9]([-a-z0-9]*[a-z0-9])?$")
              serviceAccount:
                description: |-
                  serviceAccount is a reference to a ServiceAccount used to perform all interactions
                  with the cluster that are required to manage the extension.
                  The ServiceAccount must be configured with the necessary permissions to perform these interactions.
                  The ServiceAccount must exist in the namespace referenced in the spec.
                  serviceAccount is required.
                properties:
                  name:
                    description: |-
                      name is a required, immutable reference to the name of the ServiceAccount
                      to be used for installation and management of the content for the package
                      specified in the packageName field.
                      This ServiceAccount must exist in the installNamespace.
                      name follows the DNS subdomain standard as defined in [RFC 1123].
                      It must contain only lowercase alphanumeric characters,
                      hyphens (-) or periods (.), start and end with an alphanumeric character,
                      and be no longer than 253 characters.
                      Some examples of valid values are:
                        - some-serviceaccount
                        - 123-serviceaccount
                        - 1-serviceaccount-2
                        - someserviceaccount
                        - some.serviceaccount
                      Some examples of invalid values are:
                        - -some-serviceaccount
                        - some-serviceaccount-
                      [RFC 1123]: https://tools.ietf.org/html/rfc1123
                    maxLength: 253
                    type: string
                    x-kubernetes-validations:
                    - message: name is immutable
                      rule: self == oldSelf
                    - message: name must be a valid DNS1123 subdomain. It must contain
                        only lowercase alphanumeric characters, hyphens (-) or periods
                        (.), start and end with an alphanumeric character, and be
                        no longer than 253 characters
                      rule: self.matches("^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$")
                required:
                - name
                type: object
              source:
                description: |-
                  source is a required field which selects the installation source of content
                  for this ClusterExtension. Selection is performed by setting the sourceType.
                  Catalog is currently the only implemented sourceType, and setting the
                  sourcetype to "Catalog" requires the catalog field to also be defined.
                  Below is a minimal example of a source definition (in yaml):
                  source:
                    sourceType: Catalog
                    catalog:
                      packageName: example-package
                properties:
                  catalog:
                    description: |-
                      catalog is used to configure how information is sourced from a catalog.
                      This field is required when sourceType is "Catalog", and forbidden otherwise.
                    properties:
                      channels:
                        description: |-
                          channels is an optional reference to a set of channels belonging to
                          the package specified in the packageName field.
                          A "channel" is a package-author-defined stream of updates for an extension.
                          Each channel in the list must follow the DNS subdomain standard
                          as defined in [RFC 1123]. It must contain only lowercase alphanumeric characters,
                          hyphens (-) or periods (.), start and end with an alphanumeric character,
                          and be no longer than 253 characters. No more than 256 channels can be specified.
                          When specified, it is used to constrain the set of installable bundles and
                          the automated upgrade path. This constraint is an AND operation with the
                          version field. For example:
                            - Given channel is set to "foo"
                            - Given version is set to ">=1.0.0, <1.5.0"
                            - Only bundles that exist in channel "foo" AND satisfy the version range comparison will be considered installable
                            - Automatic upgrades will be constrained to upgrade edges defined by the selected channel
                          When unspecified, upgrade edges across all channels will be used to identify valid automatic upgrade paths.
                          Some examples of valid values are:
                            - 1.1.x
                            - alpha
                            - stable
                            - stable-v1
                            - v1-stable
                            - dev-preview
                            - preview
                            - community
                          Some examples of invalid values are:
                            - -some-channel
                            - some-channel-
                            - thisisareallylongchannelnamethatisgreaterthanthemaximumlength
                            - original_40
                            - --default-channel
                          [RFC 1123]: https://tools.ietf.org/html/rfc1123
                        items:
                          maxLength: 253
                          type: string
                          x-kubernetes-validations:
                          - message: channels entries must be valid DNS1123 subdomains
                            rule: self.matches("^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$")
                        maxItems: 256
                        type: array
                      packageName:
                        description: |-
                          packageName is a reference to the name of the package to be installed
                          and is used to filter the content from catalogs.
                          packageName is required, immutable, and follows the DNS subdomain standard
                          as defined in [RFC 1123]. It must contain only lowercase alphanumeric characters,
                          hyphens (-) or periods (.), start and end with an alphanumeric character,
                          and be no longer than 253 characters.
                          Some examples of valid values are:
                            - some-package
                            - 123-package
                            - 1-package-2
                            - somepackage
                          Some examples of invalid values are:
                            - -some-package
                            - some-package-
                            - thisisareallylongpackagenamethatisgreaterthanthemaximumlength
                            - some.package
                          [RFC 1123]: https://tools.ietf.org/html/rfc1123
                        maxLength: 253
                        type: string
                        x-kubernetes-validations:
                        - message: packageName is immutable
                          rule: self == oldSelf
                        - message: packageName must be a valid DNS1123 subdomain.
                            It must contain only lowercase alphanumeric characters,
                            hyphens (-) or periods (.), start and end with an alphanumeric
                            character, and be no longer than 253 characters
                          rule: self.matches("^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$")
                      selector:
                        description: |-
                          selector is an optional field that can be used
                          to filter the set of ClusterCatalogs used in the bundle
                          selection process.
                          When unspecified, all ClusterCatalogs will be used in
                          the bundle selection process.
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
                      upgradeConstraintPolicy:
                        default: CatalogProvided
                        description: |-
                          upgradeConstraintPolicy is an optional field that controls whether
                          the upgrade path(s) defined in the catalog are enforced for the package
                          referenced in the packageName field.
                          Allowed values are: "CatalogProvided" or "SelfCertified", or omitted.
                          When this field is set to "CatalogProvided", automatic upgrades will only occur
                          when upgrade constraints specified by the package author are met.
                          When this field is set to "SelfCertified", the upgrade constraints specified by
                          the package author are ignored. This allows for upgrades and downgrades to
                          any version of the package. This is considered a dangerous operation as it
                          can lead to unknown and potentially disastrous outcomes, such as data
                          loss. It is assumed that users have independently verified changes when
                          using this option.
                          When this field is omitted, the default value is "CatalogProvided".
                        enum:
                        - CatalogProvided
                        - SelfCertified
                        type: string
                      version:
                        description: |-
                          version is an optional semver constraint (a specific version or range of versions). When unspecified, the latest version available will be installed.
                          Acceptable version ranges are no longer than 64 characters.
                          Version ranges are composed of comma- or space-delimited values and one or
                          more comparison operators, known as comparison strings. Additional
                          comparison strings can be added using the OR operator (||).
                          # Range Comparisons
                          To specify a version range, you can use a comparison string like ">=3.0,
                          <3.6". When specifying a range, automatic updates will occur within that
                          range. The example comparison string means "install any version greater than
                          or equal to 3.0.0 but less than 3.6.0.". It also states intent that if any
                          upgrades are available within the version range after initial installation,
                          those upgrades should be automatically performed.
                          # Pinned Versions
                          To specify an exact version to install you can use a version range that
                          "pins" to a specific version. When pinning to a specific version, no
                          automatic updates will occur. An example of a pinned version range is
                          "0.6.0", which means "only install version 0.6.0 and never
                          upgrade from this version".
                          # Basic Comparison Operators
                          The basic comparison operators and their meanings are:
                            - "=", equal (not aliased to an operator)
                            - "!=", not equal
                            - "<", less than
                            - ">", greater than
                            - ">=", greater than OR equal to
                            - "<=", less than OR equal to
                          # Wildcard Comparisons
                          You can use the "x", "X", and "*" characters as wildcard characters in all
                          comparison operations. Some examples of using the wildcard characters:
                            - "1.2.x", "1.2.X", and "1.2.*" is equivalent to ">=1.2.0, < 1.3.0"
                            - ">= 1.2.x", ">= 1.2.X", and ">= 1.2.*" is equivalent to ">= 1.2.0"
                            - "<= 2.x", "<= 2.X", and "<= 2.*" is equivalent to "< 3"
                            - "x", "X", and "*" is equivalent to ">= 0.0.0"
                          # Patch Release Comparisons
                          When you want to specify a minor version up to the next major version you
                          can use the "~" character to perform patch comparisons. Some examples:
                            - "~1.2.3" is equivalent to ">=1.2.3, <1.3.0"
                            - "~1" and "~1.x" is equivalent to ">=1, <2"
                            - "~2.3" is equivalent to ">=2.3, <2.4"
                            - "~1.2.x" is equivalent to ">=1.2.0, <1.3.0"
                          # Major Release Comparisons
                          You can use the "^" character to make major release comparisons after a
                          stable 1.0.0 version is published. If there is no stable version published, // minor versions define the stability level. Some examples:
                            - "^1.2.3" is equivalent to ">=1.2.3, <2.0.0"
                            - "^1.2.x" is equivalent to ">=1.2.0, <2.0.0"
                            - "^2.3" is equivalent to ">=2.3, <3"
                            - "^2.x" is equivalent to ">=2.0.0, <3"
                            - "^0.2.3" is equivalent to ">=0.2.3, <0.3.0"
                            - "^0.2" is equivalent to ">=0.2.0, <0.3.0"
                            - "^0.0.3" is equvalent to ">=0.0.3, <0.0.4"
                            - "^0.0" is equivalent to ">=0.0.0, <0.1.0"
                            - "^0" is equivalent to ">=0.0.0, <1.0.0"
                          # OR Comparisons
                          You can use the "||" character to represent an OR operation in the version
                          range. Some examples:
                            - ">=1.2.3, <2.0.0 || >3.0.0"
                            - "^0 || ^3 || ^5"
                          For more information on semver, please see https://semver.org/
                        maxLength: 64
                        type: string
                        x-kubernetes-validations:
                        - message: invalid version expression
                          rule: self.matches("^(\\s*(=||!=|>|<|>=|=>|<=|=<|~|~>|\\^)\\s*(v?(0|[1-9]\\d*|[x|X|\\*])(\\.(0|[1-9]\\d*|x|X|\\*]))?(\\.(0|[1-9]\\d*|x|X|\\*))?(-([0-9A-Za-z\\-]+(\\.[0-9A-Za-z\\-]+)*))?(\\+([0-9A-Za-z\\-]+(\\.[0-9A-Za-z\\-]+)*))?)\\s*)((?:\\s+|,\\s*|\\s*\\|\\|\\s*)(=||!=|>|<|>=|=>|<=|=<|~|~>|\\^)\\s*(v?(0|[1-9]\\d*|x|X|\\*])(\\.(0|[1-9]\\d*|x|X|\\*))?(\\.(0|[1-9]\\d*|x|X|\\*]))?(-([0-9A-Za-z\\-]+(\\.[0-9A-Za-z\\-]+)*))?(\\+([0-9A-Za-z\\-]+(\\.[0-9A-Za-z\\-]+)*))?)\\s*)*$")
                    required:
                    - packageName
                    type: object
                  sourceType:
                    description: |-
                      sourceType is a required reference to the type of install source.
                      Allowed values are "Catalog"
                      When this field is set to "Catalog", information for determining the
                      appropriate bundle of content to install will be fetched from
                      ClusterCatalog resources existing on the cluster.
                      When using the Catalog sourceType, the catalog field must also be set.
                    enum:
                    - Catalog
                    type: string
                required:
                - sourceType
                type: object
                x-kubernetes-validations:
                - message: catalog is required when sourceType is Catalog, and forbidden
                    otherwise
                  rule: 'has(self.sourceType) && self.sourceType == ''Catalog'' ?
                    has(self.catalog) : !has(self.catalog)'
            required:
            - namespace
            - serviceAccount
            - source
            type: object
          status:
            description: status is an optional field that defines the observed state
              of the ClusterExtension.
            properties:
              conditions:
                description: |-
                  The set of condition types which apply to all spec.source variations are Installed and Progressing.
                  The Installed condition represents whether or not the bundle has been installed for this ClusterExtension.
                  When Installed is True and the Reason is Succeeded, the bundle has been successfully installed.
                  When Installed is False and the Reason is Failed, the bundle has failed to install.
                  The Progressing condition represents whether or not the ClusterExtension is advancing towards a new state.
                  When Progressing is True and the Reason is Succeeded, the ClusterExtension is making progress towards a new state.
                  When Progressing is True and the Reason is Retrying, the ClusterExtension has encountered an error that could be resolved on subsequent reconciliation attempts.
                  When Progressing is False and the Reason is Blocked, the ClusterExtension has encountered an error that requires manual intervention for recovery.
                  When the ClusterExtension is sourced from a catalog, if may also communicate a deprecation condition.
                  These are indications from a package owner to guide users away from a particular package, channel, or bundle.
                  BundleDeprecated is set if the requested bundle version is marked deprecated in the catalog.
                  ChannelDeprecated is set if the requested channel is marked deprecated in the catalog.
                  PackageDeprecated is set if the requested package is marked deprecated in the catalog.
                  Deprecated is a rollup condition that is present when any of the deprecated conditions are present.
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
                      - 'True'
                      - 'False'
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
              install:
                description: install is a representation of the current installation
                  status for this ClusterExtension.
                properties:
                  bundle:
                    description: |-
                      bundle is a required field which represents the identifying attributes of a bundle.
                      A "bundle" is a versioned set of content that represents the resources that
                      need to be applied to a cluster to install a package.
                    properties:
                      name:
                        description: |-
                          name is required and follows the DNS subdomain standard
                          as defined in [RFC 1123]. It must contain only lowercase alphanumeric characters,
                          hyphens (-) or periods (.), start and end with an alphanumeric character,
                          and be no longer than 253 characters.
                        type: string
                        x-kubernetes-validations:
                        - message: packageName must be a valid DNS1123 subdomain.
                            It must contain only lowercase alphanumeric characters,
                            hyphens (-) or periods (.), start and end with an alphanumeric
                            character, and be no longer than 253 characters
                          rule: self.matches("^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$")
                      version:
                        description: |-
                          version is a required field and is a reference to the version that this bundle represents
                          version follows the semantic versioning standard as defined in https://semver.org/.
                        type: string
                        x-kubernetes-validations:
                        - message: version must be well-formed semver
                          rule: self.matches("^([0-9]+)(\\.[0-9]+)?(\\.[0-9]+)?(-([-0-9A-Za-z]+(\\.[-0-9A-Za-z]+)*))?(\\+([-0-9A-Za-z]+(-\\.[-0-9A-Za-z]+)*))?")
                    required:
                    - name
                    - version
                    type: object
                required:
                - bundle
                type: object
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
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: operator-controller-controller-manager
  namespace: olmv1-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: operator-controller-leader-election-role
  namespace: olmv1-system
rules:
- apiGroups:
  - ''
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
  - ''
  resources:
  - events
  verbs:
  - create
  - patch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: operator-controller-manager-role
  namespace: olmv1-system
rules:
- apiGroups:
  - ''
  resources:
  - secrets
  verbs:
  - create
  - delete
  - deletecollection
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
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: operator-controller-clusterextension-editor-role
rules:
- apiGroups:
  - olm.operatorframework.io
  resources:
  - clusterextensions
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
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: operator-controller-clusterextension-viewer-role
rules:
- apiGroups:
  - olm.operatorframework.io
  resources:
  - clusterextensions
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: operator-controller-extension-editor-role
rules:
- apiGroups:
  - olm.operatorframework.io
  resources:
  - extensions
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
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: operator-controller-extension-viewer-role
rules:
- apiGroups:
  - olm.operatorframework.io
  resources:
  - extensions
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: operator-controller-manager-role
rules:
- apiGroups:
  - apiextensions.k8s.io
  resources:
  - customresourcedefinitions
  verbs:
  - get
- apiGroups:
  - ''
  resources:
  - serviceaccounts/token
  verbs:
  - create
- apiGroups:
  - olm.operatorframework.io
  resources:
  - clustercatalogs
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - olm.operatorframework.io
  resources:
  - clusterextensions
  verbs:
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - olm.operatorframework.io
  resources:
  - clusterextensions/finalizers
  verbs:
  - update
- apiGroups:
  - olm.operatorframework.io
  resources:
  - clusterextensions/status
  verbs:
  - patch
  - update
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: operator-controller-metrics-reader
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
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: operator-controller-proxy-role
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
kind: RoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: operator-controller-leader-election-rolebinding
  namespace: olmv1-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: operator-controller-leader-election-role
subjects:
- kind: ServiceAccount
  name: operator-controller-controller-manager
  namespace: olmv1-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: operator-controller-manager-rolebinding
  namespace: olmv1-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: operator-controller-manager-role
subjects:
- kind: ServiceAccount
  name: operator-controller-controller-manager
  namespace: olmv1-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: operator-controller-manager-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: operator-controller-manager-role
subjects:
- kind: ServiceAccount
  name: operator-controller-controller-manager
  namespace: olmv1-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: operator-controller-proxy-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: operator-controller-proxy-role
subjects:
- kind: ServiceAccount
  name: operator-controller-controller-manager
  namespace: olmv1-system
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    control-plane: operator-controller-controller-manager
    heritage: metalk8s
  name: operator-controller-service
  namespace: olmv1-system
spec:
  ports:
  - name: https
    port: 8443
    protocol: TCP
    targetPort: 8443
  selector:
    control-plane: operator-controller-controller-manager
---
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    kubectl.kubernetes.io/default-logs-container: manager
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    control-plane: operator-controller-controller-manager
    heritage: metalk8s
  name: operator-controller-controller-manager
  namespace: olmv1-system
spec:
  replicas: 1
  selector:
    matchLabels:
      control-plane: operator-controller-controller-manager
  template:
    metadata:
      annotations:
        kubectl.kubernetes.io/default-container: manager
      labels:
        control-plane: operator-controller-controller-manager
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/arch
                operator: In
                values:
                - amd64
                - arm64
                - ppc64le
                - s390x
              - key: kubernetes.io/os
                operator: In
                values:
                - linux
      containers:
      - args:
        - --health-probe-bind-address=:8081
        - --metrics-bind-address=:8443
        - --leader-elect
        - --ca-certs-dir=/var/certs
        - --tls-cert=/var/certs/tls.cert
        - --tls-key=/var/certs/tls.key
        command:
        - /manager
        image: {% endraw -%}{{ build_image_name("operator-controller", False) }}{%- raw %}:v1.1.0
        imagePullPolicy: IfNotPresent
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8081
          initialDelaySeconds: 15
          periodSeconds: 20
        name: manager
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            cpu: 10m
            memory: 64Mi
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
        terminationMessagePolicy: FallbackToLogsOnError
        volumeMounts:
        - mountPath: /var/cache
          name: cache
        - mountPath: /var/certs/
          name: olmv1-certificate
          readOnly: true
        - mountPath: /etc/containers/
          name: registries-conf
      nodeSelector:
        kubernetes.io/os: linux
        node-role.kubernetes.io/infra: ''
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      serviceAccountName: operator-controller-controller-manager
      terminationGracePeriodSeconds: 10
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
      volumes:
      - emptyDir: {}
        name: cache
      - name: olmv1-certificate
        secret:
          items:
          - key: ca.crt
            path: olm-ca.crt
          - key: tls.crt
            path: tls.cert
          - key: tls.key
            path: tls.key
          optional: false
          secretName: olmv1-cert
      - configMap:
          name: registries-conf
        name: registries-conf
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: olmv1-ca
  namespace: metalk8s-certs
spec:
  commonName: olmv1-ca
  isCA: true
  issuerRef:
    group: cert-manager.io
    kind: Issuer
    name: self-sign-issuer
  privateKey:
    algorithm: ECDSA
    size: 256
  secretName: olmv1-ca
  secretTemplate:
    annotations:
      cert-manager.io/allow-direct-injection: 'true'
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: olmv1-cert
  namespace: olmv1-system
spec:
  dnsNames:
  - operator-controller-service.olmv1-system.svc
  - operator-controller-service.olmv1-system.svc.cluster.local
  issuerRef:
    group: cert-manager.io
    kind: ClusterIssuer
    name: olmv1-ca
  privateKey:
    algorithm: ECDSA
    size: 256
  secretName: olmv1-cert
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: olmv1-ca
spec:
  ca:
    secretName: olmv1-ca
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: self-sign-issuer
  namespace: metalk8s-certs
spec:
  selfSigned: {}
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.16.1
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: clustercatalogs.olm.operatorframework.io
spec:
  group: olm.operatorframework.io
  names:
    kind: ClusterCatalog
    listKind: ClusterCatalogList
    plural: clustercatalogs
    singular: clustercatalog
  scope: Cluster
  versions:
  - additionalPrinterColumns:
    - jsonPath: .status.lastUnpacked
      name: LastUnpacked
      type: date
    - jsonPath: .status.conditions[?(@.type=="Serving")].status
      name: Serving
      type: string
    - jsonPath: .metadata.creationTimestamp
      name: Age
      type: date
    name: v1
    schema:
      openAPIV3Schema:
        description: |-
          ClusterCatalog enables users to make File-Based Catalog (FBC) catalog data available to the cluster.
          For more information on FBC, see https://olm.operatorframework.io/docs/reference/file-based-catalogs/#docs
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
              spec is the desired state of the ClusterCatalog.
              spec is required.
              The controller will work to ensure that the desired
              catalog is unpacked and served over the catalog content HTTP server.
            properties:
              availabilityMode:
                default: Available
                description: |-
                  availabilityMode allows users to define how the ClusterCatalog is made available to clients on the cluster.
                  availabilityMode is optional.
                  Allowed values are "Available" and "Unavailable" and omitted.
                  When omitted, the default value is "Available".
                  When set to "Available", the catalog contents will be unpacked and served over the catalog content HTTP server.
                  Setting the availabilityMode to "Available" tells clients that they should consider this ClusterCatalog
                  and its contents as usable.
                  When set to "Unavailable", the catalog contents will no longer be served over the catalog content HTTP server.
                  When set to this availabilityMode it should be interpreted the same as the ClusterCatalog not existing.
                  Setting the availabilityMode to "Unavailable" can be useful in scenarios where a user may not want
                  to delete the ClusterCatalog all together, but would still like it to be treated as if it doesn't exist.
                enum:
                - Unavailable
                - Available
                type: string
              priority:
                default: 0
                description: |-
                  priority allows the user to define a priority for a ClusterCatalog.
                  priority is optional.
                  A ClusterCatalog's priority is used by clients as a tie-breaker between ClusterCatalogs that meet the client's requirements.
                  A higher number means higher priority.
                  It is up to clients to decide how to handle scenarios where multiple ClusterCatalogs with the same priority meet their requirements.
                  When deciding how to break the tie in this scenario, it is recommended that clients prompt their users for additional input.
                  When omitted, the default priority is 0 because that is the zero value of integers.
                  Negative numbers can be used to specify a priority lower than the default.
                  Positive numbers can be used to specify a priority higher than the default.
                  The lowest possible value is -2147483648.
                  The highest possible value is 2147483647.
                format: int32
                type: integer
              source:
                description: |-
                  source allows a user to define the source of a catalog.
                  A "catalog" contains information on content that can be installed on a cluster.
                  Providing a catalog source makes the contents of the catalog discoverable and usable by
                  other on-cluster components.
                  These on-cluster components may do a variety of things with this information, such as
                  presenting the content in a GUI dashboard or installing content from the catalog on the cluster.
                  The catalog source must contain catalog metadata in the File-Based Catalog (FBC) format.
                  For more information on FBC, see https://olm.operatorframework.io/docs/reference/file-based-catalogs/#docs.
                  source is a required field.
                  Below is a minimal example of a ClusterCatalogSpec that sources a catalog from an image:
                   source:
                     type: Image
                     image:
                       ref: quay.io/operatorhubio/catalog:latest
                properties:
                  image:
                    description: |-
                      image is used to configure how catalog contents are sourced from an OCI image.
                      This field is required when type is Image, and forbidden otherwise.
                    properties:
                      pollIntervalMinutes:
                        description: |-
                          pollIntervalMinutes allows the user to set the interval, in minutes, at which the image source should be polled for new content.
                          pollIntervalMinutes is optional.
                          pollIntervalMinutes can not be specified when ref is a digest-based reference.
                          When omitted, the image will not be polled for new content.
                        minimum: 1
                        type: integer
                      ref:
                        description: |-
                          ref allows users to define the reference to a container image containing Catalog contents.
                          ref is required.
                          ref can not be more than 1000 characters.
                          A reference can be broken down into 3 parts - the domain, name, and identifier.
                          The domain is typically the registry where an image is located.
                          It must be alphanumeric characters (lowercase and uppercase) separated by the "." character.
                          Hyphenation is allowed, but the domain must start and end with alphanumeric characters.
                          Specifying a port to use is also allowed by adding the ":" character followed by numeric values.
                          The port must be the last value in the domain.
                          Some examples of valid domain values are "registry.mydomain.io", "quay.io", "my-registry.io:8080".
                          The name is typically the repository in the registry where an image is located.
                          It must contain lowercase alphanumeric characters separated only by the ".", "_", "__", "-" characters.
                          Multiple names can be concatenated with the "/" character.
                          The domain and name are combined using the "/" character.
                          Some examples of valid name values are "operatorhubio/catalog", "catalog", "my-catalog.prod".
                          An example of the domain and name parts of a reference being combined is "quay.io/operatorhubio/catalog".
                          The identifier is typically the tag or digest for an image reference and is present at the end of the reference.
                          It starts with a separator character used to distinguish the end of the name and beginning of the identifier.
                          For a digest-based reference, the "@" character is the separator.
                          For a tag-based reference, the ":" character is the separator.
                          An identifier is required in the reference.
                          Digest-based references must contain an algorithm reference immediately after the "@" separator.
                          The algorithm reference must be followed by the ":" character and an encoded string.
                          The algorithm must start with an uppercase or lowercase alpha character followed by alphanumeric characters and may contain the "-", "_", "+", and "." characters.
                          Some examples of valid algorithm values are "sha256", "sha256+b64u", "multihash+base58".
                          The encoded string following the algorithm must be hex digits (a-f, A-F, 0-9) and must be a minimum of 32 characters.
                          Tag-based references must begin with a word character (alphanumeric + "_") followed by word characters or ".", and "-" characters.
                          The tag must not be longer than 127 characters.
                          An example of a valid digest-based image reference is "quay.io/operatorhubio/catalog@sha256:200d4ddb2a73594b91358fe6397424e975205bfbe44614f5846033cad64b3f05"
                          An example of a valid tag-based image reference is "quay.io/operatorhubio/catalog:latest"
                        maxLength: 1000
                        type: string
                        x-kubernetes-validations:
                        - message: must start with a valid domain. valid domains must
                            be alphanumeric characters (lowercase and uppercase) separated
                            by the "." character.
                          rule: self.matches('^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])((\\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]))+)?(:[0-9]+)?\\b')
                        - message: a valid name is required. valid names must contain
                            lowercase alphanumeric characters separated only by the
                            ".", "_", "__", "-" characters.
                          rule: self.find('(\\/[a-z0-9]+((([._]|__|[-]*)[a-z0-9]+)+)?((\\/[a-z0-9]+((([._]|__|[-]*)[a-z0-9]+)+)?)+)?)')
                            != ""
                        - message: must end with a digest or a tag
                          rule: self.find('(@.*:)') != "" || self.find(':.*$') !=
                            ""
                        - message: tag is invalid. the tag must not be more than 127
                            characters
                          rule: 'self.find(''(@.*:)'') == "" ? (self.find('':.*$'')
                            != "" ? self.find('':.*$'').substring(1).size() <= 127
                            : true) : true'
                        - message: tag is invalid. valid tags must begin with a word
                            character (alphanumeric + "_") followed by word characters
                            or ".", and "-" characters
                          rule: 'self.find(''(@.*:)'') == "" ? (self.find('':.*$'')
                            != "" ? self.find('':.*$'').matches('':[\\w][\\w.-]*$'')
                            : true) : true'
                        - message: digest algorithm is not valid. valid algorithms
                            must start with an uppercase or lowercase alpha character
                            followed by alphanumeric characters and may contain the
                            "-", "_", "+", and "." characters.
                          rule: 'self.find(''(@.*:)'') != "" ? self.find(''(@.*:)'').matches(''(@[A-Za-z][A-Za-z0-9]*([-_+.][A-Za-z][A-Za-z0-9]*)*[:])'')
                            : true'
                        - message: digest is not valid. the encoded string must be
                            at least 32 characters
                          rule: 'self.find(''(@.*:)'') != "" ? self.find('':.*$'').substring(1).size()
                            >= 32 : true'
                        - message: digest is not valid. the encoded string must only
                            contain hex characters (A-F, a-f, 0-9)
                          rule: 'self.find(''(@.*:)'') != "" ? self.find('':.*$'').matches('':[0-9A-Fa-f]*$'')
                            : true'
                    required:
                    - ref
                    type: object
                    x-kubernetes-validations:
                    - message: cannot specify pollIntervalMinutes while using digest-based
                        image
                      rule: 'self.ref.find(''(@.*:)'') != "" ? !has(self.pollIntervalMinutes)
                        : true'
                  type:
                    description: |-
                      type is a reference to the type of source the catalog is sourced from.
                      type is required.
                      The only allowed value is "Image".
                      When set to "Image", the ClusterCatalog content will be sourced from an OCI image.
                      When using an image source, the image field must be set and must be the only field defined for this type.
                    enum:
                    - Image
                    type: string
                required:
                - type
                type: object
                x-kubernetes-validations:
                - message: image is required when source type is Image, and forbidden
                    otherwise
                  rule: 'has(self.type) && self.type == ''Image'' ? has(self.image)
                    : !has(self.image)'
            required:
            - source
            type: object
          status:
            description: |-
              status contains information about the state of the ClusterCatalog such as:
                - Whether or not the catalog contents are being served via the catalog content HTTP server
                - Whether or not the ClusterCatalog is progressing to a new state
                - A reference to the source from which the catalog contents were retrieved
            properties:
              conditions:
                description: |-
                  conditions is a representation of the current state for this ClusterCatalog.
                  The current condition types are Serving and Progressing.
                  The Serving condition is used to represent whether or not the contents of the catalog is being served via the HTTP(S) web server.
                  When it has a status of True and a reason of Available, the contents of the catalog are being served.
                  When it has a status of False and a reason of Unavailable, the contents of the catalog are not being served because the contents are not yet available.
                  When it has a status of False and a reason of UserSpecifiedUnavailable, the contents of the catalog are not being served because the catalog has been intentionally marked as unavailable.
                  The Progressing condition is used to represent whether or not the ClusterCatalog is progressing or is ready to progress towards a new state.
                  When it has a status of True and a reason of Retrying, there was an error in the progression of the ClusterCatalog that may be resolved on subsequent reconciliation attempts.
                  When it has a status of True and a reason of Succeeded, the ClusterCatalog has successfully progressed to a new state and is ready to continue progressing.
                  When it has a status of False and a reason of Blocked, there was an error in the progression of the ClusterCatalog that requires manual intervention for recovery.
                  In the case that the Serving condition is True with reason Available and Progressing is True with reason Retrying, the previously fetched
                  catalog contents are still being served via the HTTP(S) web server while we are progressing towards serving a new version of the catalog
                  contents. This could occur when we've initially fetched the latest contents from the source for this catalog and when polling for changes
                  to the contents we identify that there are updates to the contents.
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
                      - 'True'
                      - 'False'
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
              lastUnpacked:
                description: |-
                  lastUnpacked represents the last time the contents of the
                  catalog were extracted from their source format. As an example,
                  when using an Image source, the OCI image will be pulled and the
                  image layers written to a file-system backed cache. We refer to the
                  act of this extraction from the source format as "unpacking".
                format: date-time
                type: string
              resolvedSource:
                description: resolvedSource contains information about the resolved
                  source based on the source type.
                properties:
                  image:
                    description: |-
                      image is a field containing resolution information for a catalog sourced from an image.
                      This field must be set when type is Image, and forbidden otherwise.
                    properties:
                      ref:
                        description: |-
                          ref contains the resolved image digest-based reference.
                          The digest format is used so users can use other tooling to fetch the exact
                          OCI manifests that were used to extract the catalog contents.
                        maxLength: 1000
                        type: string
                        x-kubernetes-validations:
                        - message: must start with a valid domain. valid domains must
                            be alphanumeric characters (lowercase and uppercase) separated
                            by the "." character.
                          rule: self.matches('^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])((\\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]))+)?(:[0-9]+)?\\b')
                        - message: a valid name is required. valid names must contain
                            lowercase alphanumeric characters separated only by the
                            ".", "_", "__", "-" characters.
                          rule: self.find('(\\/[a-z0-9]+((([._]|__|[-]*)[a-z0-9]+)+)?((\\/[a-z0-9]+((([._]|__|[-]*)[a-z0-9]+)+)?)+)?)')
                            != ""
                        - message: must end with a digest
                          rule: self.find('(@.*:)') != ""
                        - message: digest algorithm is not valid. valid algorithms
                            must start with an uppercase or lowercase alpha character
                            followed by alphanumeric characters and may contain the
                            "-", "_", "+", and "." characters.
                          rule: 'self.find(''(@.*:)'') != "" ? self.find(''(@.*:)'').matches(''(@[A-Za-z][A-Za-z0-9]*([-_+.][A-Za-z][A-Za-z0-9]*)*[:])'')
                            : true'
                        - message: digest is not valid. the encoded string must be
                            at least 32 characters
                          rule: 'self.find(''(@.*:)'') != "" ? self.find('':.*$'').substring(1).size()
                            >= 32 : true'
                        - message: digest is not valid. the encoded string must only
                            contain hex characters (A-F, a-f, 0-9)
                          rule: 'self.find(''(@.*:)'') != "" ? self.find('':.*$'').matches('':[0-9A-Fa-f]*$'')
                            : true'
                    required:
                    - ref
                    type: object
                  type:
                    description: |-
                      type is a reference to the type of source the catalog is sourced from.
                      type is required.
                      The only allowed value is "Image".
                      When set to "Image", information about the resolved image source will be set in the 'image' field.
                    enum:
                    - Image
                    type: string
                required:
                - image
                - type
                type: object
                x-kubernetes-validations:
                - message: image is required when source type is Image, and forbidden
                    otherwise
                  rule: 'has(self.type) && self.type == ''Image'' ? has(self.image)
                    : !has(self.image)'
              urls:
                description: urls contains the URLs that can be used to access the
                  catalog.
                properties:
                  base:
                    description: |-
                      base is a cluster-internal URL that provides endpoints for
                      accessing the content of the catalog.
                      It is expected that clients append the path for the endpoint they wish
                      to access.
                      Currently, only a single endpoint is served and is accessible at the path
                      /api/v1.
                      The endpoints served for the v1 API are:
                        - /all - this endpoint returns the entirety of the catalog contents in the FBC format
                      As the needs of users and clients of the evolve, new endpoints may be added.
                    maxLength: 525
                    type: string
                    x-kubernetes-validations:
                    - message: must be a valid URL
                      rule: isURL(self)
                    - message: scheme must be either http or https
                      rule: 'isURL(self) ? (url(self).getScheme() == "http" || url(self).getScheme()
                        == "https") : true'
                required:
                - base
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
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: catalogd
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: catalogd-controller-manager
  namespace: olmv1-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: catalogd
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: catalogd-leader-election-role
  namespace: olmv1-system
rules:
- apiGroups:
  - ''
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
  - ''
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
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: catalogd-manager-role
rules:
- apiGroups:
  - olm.operatorframework.io
  resources:
  - clustercatalogs
  verbs:
  - create
  - delete
  - get
  - list
  - patch
  - update
  - watch
- apiGroups:
  - olm.operatorframework.io
  resources:
  - clustercatalogs/finalizers
  verbs:
  - update
- apiGroups:
  - olm.operatorframework.io
  resources:
  - clustercatalogs/status
  verbs:
  - get
  - patch
  - update
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: catalogd
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: catalogd-metrics-reader
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
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: catalogd
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: catalogd-proxy-role
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
kind: RoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: catalogd
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: catalogd-leader-election-rolebinding
  namespace: olmv1-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: catalogd-leader-election-role
subjects:
- kind: ServiceAccount
  name: catalogd-controller-manager
  namespace: olmv1-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: catalogd
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: catalogd-manager-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: catalogd-manager-role
subjects:
- kind: ServiceAccount
  name: catalogd-controller-manager
  namespace: olmv1-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: catalogd
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: catalogd-proxy-rolebinding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: catalogd-proxy-role
subjects:
- kind: ServiceAccount
  name: catalogd-controller-manager
  namespace: olmv1-system
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: catalogd
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: catalogd-service
  namespace: olmv1-system
spec:
  ports:
  - name: https
    port: 443
    protocol: TCP
    targetPort: 8443
  - name: webhook
    port: 9443
    protocol: TCP
    targetPort: 9443
  - name: metrics
    port: 7443
    protocol: TCP
    targetPort: 7443
  selector:
    control-plane: catalogd-controller-manager
---
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    kubectl.kubernetes.io/default-logs-container: manager
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    control-plane: catalogd-controller-manager
    heritage: metalk8s
  name: catalogd-controller-manager
  namespace: olmv1-system
spec:
  minReadySeconds: 5
  replicas: 1
  selector:
    matchLabels:
      control-plane: catalogd-controller-manager
  template:
    metadata:
      annotations:
        kubectl.kubernetes.io/default-container: manager
      labels:
        control-plane: catalogd-controller-manager
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/arch
                operator: In
                values:
                - amd64
                - arm64
                - ppc64le
                - s390x
              - key: kubernetes.io/os
                operator: In
                values:
                - linux
      containers:
      - args:
        - --leader-elect
        - --metrics-bind-address=:7443
        - --external-address=catalogd-service.olmv1-system.svc
        - --tls-cert=/var/certs/tls.crt
        - --tls-key=/var/certs/tls.key
        - --ca-certs-dir=/var/ca-certs
        command:
        - ./manager
        image: {% endraw -%}{{ build_image_name("catalogd", False) }}{%- raw %}:v1.1.0
        imagePullPolicy: IfNotPresent
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8081
          initialDelaySeconds: 15
          periodSeconds: 20
        name: manager
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            cpu: 100m
            memory: 200Mi
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
        terminationMessagePolicy: FallbackToLogsOnError
        volumeMounts:
        - mountPath: /var/cache/
          name: cache
        - mountPath: /var/certs
          name: catalogserver-certs
        - mountPath: /var/ca-certs/
          name: olmv1-certificate
          readOnly: true
        - mountPath: /etc/containers/
          name: registries-conf
      nodeSelector:
        kubernetes.io/os: linux
        node-role.kubernetes.io/infra: ''
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      serviceAccountName: catalogd-controller-manager
      terminationGracePeriodSeconds: 10
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
      volumes:
      - emptyDir: {}
        name: cache
      - name: catalogserver-certs
        secret:
          secretName: catalogd-service-cert-v1.1.0
      - name: olmv1-certificate
        secret:
          items:
          - key: ca.crt
            path: olm-ca.crt
          optional: false
          secretName: catalogd-service-cert-v1.1.0
      - configMap:
          name: registries-conf
        name: registries-conf
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: catalogd-service-cert
  namespace: olmv1-system
spec:
  dnsNames:
  - localhost
  - catalogd-service.olmv1-system.svc
  - catalogd-service.olmv1-system.svc.cluster.local
  issuerRef:
    group: cert-manager.io
    kind: ClusterIssuer
    name: olmv1-ca
  privateKey:
    algorithm: ECDSA
    size: 256
  secretName: catalogd-service-cert-v1.1.0
---
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  annotations:
    cert-manager.io/inject-ca-from-secret: metalk8s-certs/olmv1-ca
  labels:
    app.kubernetes.io/instance: olm
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: v1.1.0
    heritage: metalk8s
  name: catalogd-mutating-webhook-configuration
webhooks:
- admissionReviewVersions:
  - v1
  clientConfig:
    service:
      name: catalogd-service
      namespace: olmv1-system
      path: /mutate-olm-operatorframework-io-v1-clustercatalog
      port: 9443
  failurePolicy: Fail
  matchConditions:
  - expression: '''name'' in object.metadata && (!has(object.metadata.labels) || !(''olm.operatorframework.io/metadata.name''
      in object.metadata.labels) || object.metadata.labels[''olm.operatorframework.io/metadata.name'']
      != object.metadata.name)'
    name: MissingOrIncorrectMetadataNameLabel
  name: inject-metadata-name.olm.operatorframework.io
  rules:
  - apiGroups:
    - olm.operatorframework.io
    apiVersions:
    - v1
    operations:
    - CREATE
    - UPDATE
    resources:
    - clustercatalogs
  sideEffects: None
  timeoutSeconds: 10
---
apiVersion: v1
data:
  registries.conf: |-
    [[registry]]
    prefix = "{% endraw -%}{{ repo.registry_endpoint }}{%- raw %}"
    insecure = true
    location = "{% endraw -%}{{ repo.registry_endpoint }}{%- raw %}:80"
    [[registry]]
    prefix = "registry.metalk8s.lan"
    insecure = true
    location = "{% endraw -%}{{ repo.registry_endpoint }}{%- raw %}:80"
kind: ConfigMap
metadata:
  name: registries-conf
  namespace: olmv1-system

{% endraw %}

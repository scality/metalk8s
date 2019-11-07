#! metalk8s_kubernetes kubeconfig=/etc/kubernetes/admin.conf&context=kubernetes-admin@kubernetes

apiVersion: apiextensions.k8s.io/v1beta1
kind: CustomResourceDefinition
metadata:
  name: environments.solutions.metalk8s.scality.com
spec:
  group: solutions.metalk8s.scality.com
  names:
    kind: Environment
    listKind: EnvironmentList
    plural: environments
    singular: environment
  scope: Cluster
  subresources:
    status: {}
  validation:
    openAPIV3Schema:
      description: 'An Environment represents a collection of Namespaces in which
        are deployed Solution instances.'
      type: object
      properties:
        apiVersion:
          description: 'APIVersion defines the versioned schema of this
            representation of an object. Servers should convert recognized
            schemas to the latest internal value, and may reject unrecognized
            values.
            More info: https://git.k8s.io/community/contributors/devel/api-conventions.md#resources'
          type: string
        kind:
          description: 'Kind is a string value representing the REST resource this
            object represents. Servers may infer this from the endpoint the client
            submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/api-conventions.md#types-kinds'
          type: string
        metadata:
          type: object
        spec:
          properties:
            description:
              description: Description of the Environment
              type: string
            solutions:
              description: Array of Solution versions deployed in this Environment
              type: array
              items:
                type: object
                properties:
                  name:
                    description: The Solution name
                    type: string
                  version:
                    description: The Solution version
                    type: string
                required:
                  - name
                  - version
          type: object
          required:
            - solutions
        status:
          type: object
  version: v1alpha1
  versions:
  - name: v1alpha1
    served: true
    storage: true

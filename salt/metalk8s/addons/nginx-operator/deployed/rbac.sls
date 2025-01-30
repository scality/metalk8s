#!jinja | metalk8s_kubernetes

# TODO: cluster role and cluster role binding
# names must bne injected here to make sure operator-installer can only
# manage the operator's resources

# generated on running platform using
# https://github.com/operator-framework/operator-controller/tree/main/hack/tools/catalogs

---
apiVersion: v1
kind: ServiceAccount
metadata:
   name: nginx-operator-installer
   namespace: nginx-operator
---
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: nginx-operator-installer-cluster-role
rules: [
  {
    "apiGroups": [
      "olm.operatorframework.io"
    ],
    "resources": [
      "clusterextensions/finalizers"
    ],
    "verbs": [
      "update"
    ],
    "resourceNames": [
      "nginx-operator"
    ]
  },
  {
    "apiGroups": [
      "apiextensions.k8s.io"
    ],
    "resources": [
      "customresourcedefinitions"
    ],
    "verbs": [
      "create",
      "list",
      "watch"
    ]
  },
  {
    "apiGroups": [
      "apiextensions.k8s.io"
    ],
    "resources": [
      "customresourcedefinitions"
    ],
    "verbs": [
      "get",
      "update",
      "patch",
      "delete"
    ],
    "resourceNames": [
      "ingressnginxes.metalk8s.scality.com"
    ]
  },
  {
    "apiGroups": [
      "rbac.authorization.k8s.io"
    ],
    "resources": [
      "clusterroles"
    ],
    "verbs": [
      "create",
      "list",
      "watch"
    ]
  },
  {
    "apiGroups": [
      "rbac.authorization.k8s.io"
    ],
    "resources": [
      "clusterroles"
    ],
    "verbs": [
      "get",
      "update",
      "patch",
      "delete"
    ]
  },
  {
    "apiGroups": [
      "metalk8s.scality.com"
    ],
    "resources": [
      "ingressnginxes"
    ],
    "verbs": [
      "create",
      "delete",
      "get",
      "list",
      "patch",
      "update",
      "watch"
    ]
  },
  {
    "apiGroups": [
      "metalk8s.scality.com"
    ],
    "resources": [
      "ingressnginxes/status"
    ],
    "verbs": [
      "get"
    ]
  },
  {
    "apiGroups": [
      "metalk8s.scality.com"
    ],
    "resources": [
      "ingressnginxes"
    ],
    "verbs": [
      "get",
      "list",
      "watch"
    ]
  },
  {
    "apiGroups": [
      "metalk8s.scality.com"
    ],
    "resources": [
      "ingressnginxes/status"
    ],
    "verbs": [
      "get"
    ]
  },
  {
    "nonResourceURLs": [
      "/metrics"
    ],
    "verbs": [
      "get"
    ]
  },
  {
    "apiGroups": [
      ""
    ],
    "resources": [
      "namespaces"
    ],
    "verbs": [
      "get"
    ]
  },
  {
    "apiGroups": [
      ""
    ],
    "resources": [
      "secrets"
    ],
    "verbs": [
      "*"
    ]
  },
  {
    "apiGroups": [
      ""
    ],
    "resources": [
      "events"
    ],
    "verbs": [
      "create"
    ]
  },
  {
    "apiGroups": [
      "metalk8s.scality.com"
    ],
    "resources": [
      "ingressnginxes",
      "ingressnginxes/status",
      "ingressnginxes/finalizers"
    ],
    "verbs": [
      "create",
      "delete",
      "get",
      "list",
      "patch",
      "update",
      "watch"
    ]
  },
  {
    "apiGroups": [
      ""
    ],
    "resources": [
      "pods",
      "services",
      "services/finalizers",
      "endpoints",
      "persistentvolumeclaims",
      "events",
      "configmaps",
      "secrets"
    ],
    "verbs": [
      "create",
      "delete",
      "get",
      "list",
      "patch",
      "update",
      "watch"
    ]
  },
  {
    "apiGroups": [
      "apps"
    ],
    "resources": [
      "deployments",
      "daemonsets",
      "replicasets",
      "statefulsets"
    ],
    "verbs": [
      "create",
      "delete",
      "get",
      "list",
      "patch",
      "update",
      "watch"
    ]
  },
  {
    "apiGroups": [
      "authentication.k8s.io"
    ],
    "resources": [
      "tokenreviews"
    ],
    "verbs": [
      "create"
    ]
  },
  {
    "apiGroups": [
      "authorization.k8s.io"
    ],
    "resources": [
      "subjectaccessreviews"
    ],
    "verbs": [
      "create"
    ]
  },
  {
    "apiGroups": [
      "monitoring.coreos.com"
    ],
    "resources": [
      "servicemonitors"
    ],
    "verbs": [
      "*"
    ]
  },
  {
    "apiGroups": [
      "networking.k8s.io"
    ],
    "resources": [
      "ingressclasses"
    ],
    "verbs": [
      "*"
    ]
  },
  {
    "apiGroups": [
      ""
    ],
    "resources": [
      "serviceaccounts"
    ],
    "verbs": [
      "*"
    ]
  },
  {
    "apiGroups": [
      "rbac.authorization.k8s.io"
    ],
    "resources": [
      "roles",
      "rolebindings",
      "clusterroles",
      "clusterrolebindings"
    ],
    "verbs": [
      "*"
    ]
  },
  {
    "apiGroups": [
      "rbac.authorization.k8s.io"
    ],
    "resources": [
      "clusterrolebindings"
    ],
    "verbs": [
      "create",
      "list",
      "watch"
    ]
  },
  {
    "apiGroups": [
      "rbac.authorization.k8s.io"
    ],
    "resources": [
      "clusterrolebindings"
    ],
    "verbs": [
      "get",
      "update",
      "patch",
      "delete"
    ]
  },
  {
    "apiGroups": [
      ""
    ],
    "resources": [
      "configmaps"
    ],
    "verbs": [
      "get",
      "list",
      "watch",
      "create",
      "update",
      "patch",
      "delete"
    ]
  },
  {
    "apiGroups": [
      "coordination.k8s.io"
    ],
    "resources": [
      "leases"
    ],
    "verbs": [
      "get",
      "list",
      "watch",
      "create",
      "update",
      "patch",
      "delete"
    ]
  },
  {
    "apiGroups": [
      ""
    ],
    "resources": [
      "events"
    ],
    "verbs": [
      "create",
      "patch"
    ]
  }
]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: nginx-operator-installer-cluster-role-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: nginx-operator-installer-cluster-role
subjects:
  - kind: ServiceAccount
    name: nginx-operator-installer
    namespace: nginx-operator
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: nginx-operator-installer-installer-role
  namespace: nginx-operator
rules: [
  {
    "apiGroups": [
      "apps"
    ],
    "resources": [
      "deployments"
    ],
    "verbs": [
      "create",
      "list",
      "watch"
    ]
  },
  {
    "apiGroups": [
      "apps"
    ],
    "resources": [
      "deployments"
    ],
    "verbs": [
      "get",
      "update",
      "patch",
      "delete"
    ],
    "resourceNames": [
      "nginx-operator-controller-manager"
    ]
  },
  {
    "apiGroups": [
      ""
    ],
    "resources": [
      "serviceaccounts"
    ],
    "verbs": [
      "create",
      "list",
      "watch"
    ]
  },
  {
    "apiGroups": [
      ""
    ],
    "resources": [
      "serviceaccounts"
    ],
    "verbs": [
      "get",
      "update",
      "patch",
      "delete"
    ],
    "resourceNames": [
      "nginx-operator-controller-manager"
    ]
  }
]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: nginx-operator-installer-installer-role-binding
  namespace: nginx-operator
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: nginx-operator-installer-installer-role
subjects:
  - kind: ServiceAccount
    name: nginx-operator-installer
    namespace: nginx-operator


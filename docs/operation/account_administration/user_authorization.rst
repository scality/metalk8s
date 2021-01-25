User Authorization
==================

Kubernetes API
--------------

To authorize specific users and/or groups against Kubernetes API, the
:term:`API Server` relies on *RBAC* (Role-Based Access Control), through the
use of special API objects:

- **(Cluster)Roles**, which define specific permissions on a set of API
  resources,
- **(Cluster)RoleBindings**, which map a user or group to a set of
  (Cluster)Roles.

.. note::

   MetalK8s includes pre-provisioned ClusterRoles. Platform administrators can
   create new (Cluster)Roles or refer to existing ones.

ClusterRoles
************

- Obtain the list of available ClusterRoles.

  .. code-block:: shell

     root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                          get clusterroles

- Describe a ClusterRole for more information.

  .. code-block:: shell

     root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                          describe clusterrole <name>

- The pre-provisioned static user **admin@metalk8s.invalid** is already bound
  to the **cluster-admin** ClusterRole, which grants cluster-wide permissions
  to all exposed APIs.

  .. code-block:: shell

     root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                          describe clusterrole cluster-admin
     Name:         cluster-admin
     Labels:       kubernetes.io/bootstrapping=rbac-defaults
     Annotations:  rbac.authorization.kubernetes.io/autoupdate: true
     PolicyRule:
       Resources  Non-Resource URLs  Resource Names  Verbs
       ---------  -----------------  --------------  -----
       *.*        []                 []              [*]
                  [*]                []              [*]

For more information on Kubernetes authorization mechanisms, refer to the
`RBAC <https://kubernetes.io/docs/reference/access-authn-authz/rbac/>`_
documentation.

.. _bind-user-to-role:

(Cluster)RoleBindings
*********************

To bind one or more users to an existing ClusterRole in all namespaces, follow
this procedure.

#. Create a ClusterRoleBinding manifest (:file:`role_binding.yaml`) from the
   following template.

   .. code-block:: yaml

      apiVersion: rbac.authorization.k8s.io/v1
      kind: ClusterRoleBinding
      metadata:
        name: <role-binding-name-of-your-choice>
      subjects:
        - kind: User
          name: <email>
          apiGroup: rbac.authorization.k8s.io
      roleRef:
        kind: ClusterRole
        name: <target-cluster-role>
        apiGroup: rbac.authorization.k8s.io

#. Apply the manifest.

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         apply -f role_binding.yaml

.. _bind-group-to-role:

To bind one or more groups to an existing ClusterRole in all namespaces, follow
this procedure.

#. Create a ClusterRoleBinding manifest (:file:`role_binding.yaml`) from the
   following template.

   .. code-block:: yaml

      apiVersion: rbac.authorization.k8s.io/v1
      kind: ClusterRoleBinding
      metadata:
        name: <role-binding-name-of-your-choice>
      subjects:
        - kind: Group
          name: <group-name>
          apiGroup: rbac.authorization.k8s.io
      roleRef:
        kind: ClusterRole
        name: <target-cluster-role>
        apiGroup: rbac.authorization.k8s.io

#. Apply the manifest.

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         apply -f role_binding.yaml

.. todo::

   - Describe differences between ClusterRoles and Roles, and between
     ClusterRoleBindings and RoleBindings
   - List pre-installed (Cluster)Roles matching our "high-level UI roles" once
     created

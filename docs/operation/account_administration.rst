
Account Administration
======================

This section highlights **MetalK8s Account Administration** which covers
user authentication, identity management and access control.

User Authentication and Identity management
-------------------------------------------

Identity management and user authentication in MetalK8s is driven by the
integration of `kube-apiserver` and Dex (an OIDC provider).

Kubernetes API enables OpenID Connect (OIDC) as one authentication strategy
(it also supports certificate-based authentication) by trusting Dex as an
OIDC Provider.

Dex can authenticate users against:

   - a static user store (stored in configuration)
   - a connector-based interface, allowing to plug in external providers such
     as LDAP, SAML, GitHub, Active Directory and others.

MetalK8s OIDC based Services
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

MetalK8s out of the box enables OpenID Connect (OIDC) based authentication for
its UI and Grafana service.

.. _ops-grafana-admin:

Administering Grafana and MetalK8s UI
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

A fresh installation of MetalK8s has its UI and Grafana service with default
login credentials as: ``admin@metalk8s.invalid`` / ``password``.

This default user is defined in Dex configuration as a static user, to
allow MetalK8s administrators first time access to these services. It is
recommended that MetalK8s administrators change the default password.

.. note::

   The MetalK8s UI and Grafana are both configured to use OIDC as
   an authentication mechanism, and trust Dex as a Provider. Changing
   the Dex configuration, including the default credentials, will impact
   both UIs.

For information on how to access the MetalK8s UI, please refer to
:ref:`this procedure <installation-services-admin-ui>`

For information on how to access the Grafana service, please refer to
:ref:`this procedure <installation-services-grafana>`


Add new static user
^^^^^^^^^^^^^^^^^^^

To add a new static user for either the MetalK8s UI and/or Grafana service,
refer to :ref:`this procedure <Add-dex-static-user>`

Change static user password
^^^^^^^^^^^^^^^^^^^^^^^^^^^

To change the default password for the MetalK8s UI and/or Grafana service,
refer to :ref:`this procedure <Change-dex-static-user-password>`

.. todo::

   Add documentation on the following

   - Dex connectors

   - How to add a new connector (LDAP, AD, SAML)

User Authorization
------------------

Kubernetes API
^^^^^^^^^^^^^^

To authorize specific users and/or groups against Kubernetes API, the
:term:`API Server` relies on *RBAC* (Role-Based Access Control), through the
use of special API objects:

- **(Cluster)Roles**, which define specific permissions on a set of API
  resources,
- and **(Cluster)RoleBindings**, which map a user or group to a set of
  (Cluster)Roles

.. note::

   MetalK8s includes pre-provisioned ClusterRoles. Platform administrators can
   create new (Cluster)Roles or refer to existing ones.

   To obtain the list of available ClusterRoles, run the following:

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                           get clusterroles

   You can describe a ClusterRole for more information:

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                           describe clusterrole <name>

   The pre-provisioned static user **admin@metalk8s.invalid** is already bound
   to the **cluster-admin** ClusterRole, which grants cluster-wide permissions
   to all exposed APIs:

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

For more information about Kubernetes authorization mechanisms, refer to the
`RBAC <https://kubernetes.io/docs/reference/access-authn-authz/rbac/>`_
documentation.

.. _bind-user-to-role:

To bind one or more users to an existing ClusterRole in all namespaces, follow
these steps:

#. Create a ClusterRoleBinding manifest (:file:`role_binding.yaml`) from the
   following template:

   .. code-block:: yaml

      apiVersion: rbac.authorization.k8s.io/v1
      kind: ClusterRoleBinding
      metadata:
        name: <role-binding-name-of-your-choice>
      subjects:
        - kind: User
          name: oidc:<email>
          apiGroup: rbac.authorization.k8s.io
      roleRef:
        kind: ClusterRole
        name: <target-cluster-role>
        apiGroup: rbac.authorization.k8s.io

#. Apply the manifest:

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         apply -f role_binding.yaml

.. _bind-group-to-role:

To bind one or more groups to an existing ClusterRole in all namespaces, follow
these steps:

#. Create a ClusterRoleBinding manifest (:file:`role_binding.yaml`) from the
   following template:

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

#. Apply the manifest:

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         apply -f role_binding.yaml

.. todo::

   - Describe differences between ClusterRoles and Roles, and between
     ClusterRoleBindings and RoleBindings
   - List pre-installed (Cluster)Roles matching our "high-level UI roles" once
     created

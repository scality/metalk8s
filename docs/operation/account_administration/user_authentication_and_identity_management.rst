User Authentication and Identity Management
===========================================

In MetalK8s, user authentication and identity management are driven by
the integration of `kube-apiserver` and Dex (an OIDC provider).

Kubernetes API enables OpenID Connect (OIDC) as one authentication strategy
(it also supports certificate-based authentication) by trusting Dex as an
OIDC Provider.

Dex can authenticate users against:

   - a static user store (stored in configuration),
   - a connector-based interface, allowing to plug in external providers such
     as LDAP, SAML, GitHub, Active Directory and others.

.. note::

   MetalK8s out of the box enables OpenID Connect (OIDC) based authentication
   for its UI and Grafana service.

.. _ops-grafana-admin:

Administering Grafana and MetalK8s UI
-------------------------------------

When installing MetalK8s for the first time, the UI and Grafana service are
set with default login credentials: ``admin@metalk8s.invalid`` / ``password``.

This default user is defined in Dex configuration as a static user to
enable MetalK8s administrators' first access to these services. It is
recommended to change the default password after the first login.

.. note::

   The MetalK8s UI and Grafana are both configured to use OIDC as
   an authentication mechanism, and trust Dex as a Provider. Changing
   the Dex configuration, including the default credentials, will impact
   both UIs.

For information on how to access the MetalK8s UI and Grafana service, refer to
:ref:`Accessing Cluster Services <installation-services-admin-ui>`.

Adding a Static User
--------------------

To add a static user for the MetalK8s UI and/or Grafana service perform the
following steps from the Bootstrap node.

.. _generate-password-hash:

#. Generate a bcrypt hash of your password.

   .. code-block:: shell

      root@bootstrap $ htpasswd -nBC 14 "" | tr -d ':'
      New password:
      Re-type new password:
      <your hash here, starting with "$2y$14$">

#. Generate a unique identifier.

   .. code-block:: shell

      root@bootstrap $ python -c 'import uuid; print uuid.uuid4()'

#. Add a new entry in the ``staticPasswords`` list. Use the password hash and
   user ID previously generated, and choose a new email and username.

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         edit configmap metalk8s-dex-config -n metalk8s-auth

   .. code-block:: yaml

      # [...]
      data:
        config.yaml: |-
          apiVersion: addons.metalk8s.scality.com/v1alpha2
          kind: DexConfiguration
          spec:
            # [...]
            config:
              # [...]
              staticPasswords:
                # [...]
                - email: "<email>"
                  hash: "<generated-password-hash>"
                  username: "<username>"
                  userID: "<generated-identifier>"

#. Apply your changes.

   .. parsed-literal::

      root\@bootstrap $ kubectl exec -n kube-system -c salt-master \\
                         --kubeconfig /etc/kubernetes/admin.conf \\
                         salt-master-bootstrap -- salt-run state.sls \\
                         metalk8s.addons.dex.deployed saltenv=metalk8s-|version|

#. Bind the user to an existing (Cluster)Role using
   :ref:`ClusterRoleBlinding <bind-user-to-role>`.

#. Check that the user has been successfully added. If so, log into the
   MetalK8s UI using the new email and password.

Changing Static User Password
-----------------------------

.. important::

   **Default admin user**

   A new MetalK8s installation is supplied with a default administrator account,
   and a predefined password (see :ref:`Use MetalK8s UI <default-admin-login>`).
   You must change this password if your control plane network is accessible
   to untrusted clients.

To change the default password for the MetalK8s UI and/or Grafana service,
perform the following steps from the Bootstrap node.

#. Generate a bcrypt hash of the new password.

    .. code-block:: shell

       root@bootstrap $ htpasswd -nBC 14 "" | tr -d ':'
       New password:
       Re-type new password:
       <your hash here, starting with "$2y$14$">

#. Find the entry for the selected user in the ``staticPasswords`` list,
   and update its ``hash``.

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         edit configmap metalk8s-dex-config -n metalk8s-auth

   .. code-block:: yaml

      # [...]
      data:
        config.yaml: |-
          apiVersion: addons.metalk8s.scality.com/v1alpha2
          kind: DexConfiguration
          spec:
            # [...]
            config:
              # [...]
              staticPasswords:
                # [...]
                - email: "<previous-email>"
                  hash: "<new-password-hash>"
                  username: "<previous-username>"
                  userID: "<previous-identifier>"
                # [...]

#. Apply your changes.

   .. parsed-literal::

      root\@bootstrap $ kubectl exec -n kube-system -c salt-master \\
                         --kubeconfig /etc/kubernetes/admin.conf \\
                         salt-master-bootstrap -- salt-run state.sls \\
                         metalk8s.addons.dex.deployed saltenv=metalk8s-|version|

#. Check that the password has been changed. If so, log into the MetalK8s UI
   using the new password.

.. todo::

   Add documentation on the following

   - Dex connectors

   - How to add a new connector (LDAP, AD, SAML)

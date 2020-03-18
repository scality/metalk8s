Cluster and Services Configurations
===================================

This section contains information describing the list of available Cluster and
Services Configurations including procedures for customizing and applying any
given Cluster and Services Configurations.

Managing Cluster and Services Configurations
********************************************

Newly deployed **MetalK8s** clusters come with chosen default values for most
Cluster services. These default values are transparent to Admin users
and can be customized at any point in time given that Admins follow the
documented procedure to the later.

Managing Authentication
^^^^^^^^^^^^^^^^^^^^^^^

Add a local static user
"""""""""""""""""""""""

Local authentication via static users is enabled by default after a fresh
MetalK8s installation.

   .. important::

      To continue using MetalK8s in cases where the external authentication
      system fails, we advise MetalK8s administrators to leave the default
      super admin account enabled at all times.

To add a new static user, perform the following operations:

#. Generate a password ``hash``. The command below requires **apache-utils**
   package to be installed.

   .. code-block:: shell

      root@bootstrap $ htpasswd -bnBC 12 "" <replace-with-password> | tr -d ':\n'

#. Generate a unique ``UserID`` by running the following command.

   .. code-block:: shell

      root@bootstrap $ python -c 'import uuid; print uuid.uuid4()'

#. From the Bootstrap node, edit the ConfigMap ``metalk8s-dex-config`` and then
   add a new entry to the already existing list using:

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         edit configmaps metalk8s-dex-config -n metalk8s-auth

   The new entry should be unique and possess mandatory fields like ``email``,
   ``hash``, ``username`` and ``userID`` like in the example below.

   .. code-block:: yaml

      [...]
      data:
         config.yaml: |-
            spec:
               localuserstore:
                  userlist:
                    - email: "<email>"
                      hash: "<replace-with-hash>"
                      username: "<username>"
                      userID: "<uuidv4>"
      [...]

#. Save and apply the changes.

#. From the Bootstrap node, execute the following command which connects to
   the Salt master container and applies salt-states to propagate the new
   changes down to the underlying services.

   Make sure to replace the <version> prefix in the command below with the
   currently installed MetalK8s version number e.g 2.5.0

   .. code-block:: shell

      root@bootstrap $ crictl exec -it \
                         $(crictl ps -q --label io.kubernetes.container.name=salt-master) bash \
                         -c "salt-run state.sls metalk8s.addons.dex.deployed saltenv=metalk8s-<version>"

#. Finally, create and apply the required :file:`ClusterRoleBinding.yaml` file
   that ensures that the newly added static user is bound to a Cluster Role.

   .. note::

      MetalK8s installations come with already existing Cluster Roles.
      Administrators can create new Cluster Roles or refer to the existing
      Cluster Roles.

      To obtain the list of available Cluster Roles in a MetalK8s cluster,
      use the following command:

      .. code-block:: shell

         root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf get clusterroles

      For more information about a Cluster Role, run the following command to
      describe it.

      .. code-block:: shell

         root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf get clusterroles \
                            <name> -o yaml

      For starters, MetalK8s administrators can provision new users using the
      `cluster-admin` Cluster Role. Note that this Cluster Role by default
      grants cluster-wide permissions to all resources within a cluster.
      For more information refer to
      `RBAC <https://kubernetes.io/docs/reference/access-authn-authz/rbac/>`_
      documentation.


   - Use the following template to create the :file:`ClusterRoleBinding.yaml`
     file where:

      - <name> refers to any freely chosen name
      - <email> refers to the new user email as defined in step (3) above
      - <cluster-role> refers to the Cluster Role picked from the list above

   .. code-block:: yaml

      apiVersion: rbac.authorization.k8s.io/v1
      kind: ClusterRoleBinding
      metadata:
        name: <name>
      subjects:
      - kind: User
        name: <email>
        apiGroup: rbac.authorization.k8s.io
      roleRef:
        kind: ClusterRole
        name: <cluster-role>
        apiGroup: rbac.authorization.k8s.io

   - Apply the ClusterRoleBinding configurations using:

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf apply -f \
                         ClusterRoleBinding.yaml

#. Verify that the user has been successfully added and you can log in to the
   MetalK8s UI using the new email and password.

.. todo::

   Add documentation on the following tracked topics

   - Change static user password (issue #2075)

   - External authentication (issue #2013)

      - Configuring LDAP
      - Configuring Active Directory(AD)

Managing Cluster Monitoring
^^^^^^^^^^^^^^^^^^^^^^^^^^^

MetalK8s ships with Prometheus Operator which takes charge of deploying the
monitoring stack (Prometheus, Alertmanager and Grafana).
Service configurations for the 3 main services that make up the monitoring
stack can be found in the :term:`Namespace` metalk8s-monitoring under the
following ConfigMaps:

.. _Monitoring-ConfigMaps:

.. table::

   +-------------------+------------------------------+
   | **Service**       |         **ConfigMap-Name**   |
   +-------------------+------------------------------+
   | Alertmanager      | metalk8s-alertmanager-config |
   +-------------------+------------------------------+
   | Grafana           | metalk8s-grafana-config      |
   +-------------------+------------------------------+
   | Prometheus        | metalk8s-prometheus-config   |
   +-------------------+------------------------------+

Configuring replicas count
""""""""""""""""""""""""""

MetalK8s administrators can scale the monitoring stack directly by changing
the number of replicas which is by default set to a single pod per service
after a fresh MetalK8s installation.

To change the number of replicas for any of the services listed above,
perform the following operations:

#. From the Bootstrap node, edit the ConfigMap ``<ConfigMap-Name>`` attributed
   to the service and then modify the replicas entry.

   .. code-block:: shell

      root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf \
                         edit configmaps <ConfigMap-Name> -n metalk8s-monitoring

   For each service in the MetalK8s monitoring stack, consult the
   :ref:`Monitoring Services<Monitoring-ConfigMaps>` table to obtain the
   ConfigMap-Name to be used for the above command.

   Make sure to replace **<number-of-replicas>** field with an integer value
   (For example 2).

   .. code-block:: yaml

      [...]
      data:
         config.yaml: |-
            spec:
               deployment:
                  replicas: <number-of-replicas>
      [...]

#. Save and apply the changes.


#. From the Bootstrap node, execute the following command which connects to
   the Salt master container and applies salt-states to propagate the new
   changes down to the underlying services.

   Make sure to replace the <version> prefix in the command below with the
   currently installed MetalK8s version number e.g 2.5.0

   .. note::

      Scaling the number of pods for services like Prometheus and Alertmanager
      require provisioning extra persistent volumes for these pods to startup
      normally. Refer to :ref:`this procedure <Provision Prometheus storage>`
      for more information.

   .. code-block:: shell

      root@bootstrap $ crictl exec -it \
                         $(crictl ps -q --label io.kubernetes.container.name=salt-master) bash \
                         -c "salt-run state.sls metalk8s.addons.prometheus-operator.deployed saltenv=metalk8s-<version>"


.. todo::

   Add documentation on the following tracked topics

   - Add and customize Alertmanager notifications (Epic ##2193)

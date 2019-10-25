
Account Administration
======================

This section highlights **MetalK8s Account Administration** which covers
changing the default username and password for some MetalK8s services.


Administering Grafana
*********************

A fresh install of MetalK8s has a Grafana service instance with default
credentials: ``admin`` / ``admin``. For more information on how to access
Grafana, please refer to :ref:`this procedure <quickstart-services-grafana>`

Changing Grafana username and password
--------------------------------------

To change the default username and password for Grafana on a MetalK8s cluster,
perform the following procedures:

#. Create a file named ``patch-secret.yaml`` that has the following content:

   .. code-block:: yaml

      stringData:
        admin-password: <password-in-clear>
        admin-user: <username-in-clear>

#. Apply the patch file by running:

   .. code-block:: shell

      $ kubectl --kubeconfig /etc/kubernetes/admin.conf patch secrets prometheus-operator-grafana --patch "$(cat patch-secret.yaml)" -n metalk8s-monitoring

#. Now, roll out the new updates for Grafana.

   .. code-block:: shell

      $ kubectl --kubeconfig /etc/kubernetes/admin.conf rollout restart deploy prometheus-operator-grafana -n metalk8s-monitoring

#. Access the Grafana instance and authenticate yourself using the new Account
   credentials.


Administering MetalK8s GUI, Kubernetes(K8S) and Salt API
********************************************************

A fresh install of MetalK8s has a GUI instance with default credentials:
``admin`` / ``admin``. For more information on how to access the GUI, please
refer to :ref:`this procedure <quickstart-services-admin-ui>`

Managing MetalK8s GUI, K8S and Salt API username and password
-------------------------------------------------------------

  .. warning::

     #. In a typical **Metalk8s** cluster, ``/etc/kubernetes/htpasswd``
        provides access control credentials to the following 3 components:
        **MetalK8s GUI**, **K8S** and **Salt API**. Any changes made to this
        file will directly impact authentication for the 3 mentioned components.

     #. The procedures mentioned below must be carried out on every cluster
        node having an instance of the Kubernetes API server.

#. From a node running an instance of the Kubernetes API server,
   edit the file ``/etc/kubernetes/htpasswd`` replacing the
   username and/or password fields as below.

   .. code-block:: shell

      <username-in-clear>,<password-in-clear>,123,"system:masters"

#. From a node running an instance of the Kubernetes API server,
   force a restart of the Kubernetes API server.

   .. code-block:: shell

      $ crictl stop $(crictl ps -q --label io.kubernetes.pod.namespace=kube-system --label io.kubernetes.container.name=kube-apiserver --state Running)

#. Access a service (for example, MetalK8s GUI) and authenticate yourself
   using the new Account credentials.

   .. note::

      Upon changing the username and/or password, a fresh logout then login is
      required for accessing the MetalK8s GUI.


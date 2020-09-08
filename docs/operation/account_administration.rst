
Account Administration
======================

This section highlights **MetalK8s Account Administration** which covers
changing the default username and password for some MetalK8s services.


.. _ops-grafana-admin:

Administering Grafana
*********************

A fresh install of MetalK8s has a Grafana service instance with default
credentials: ``admin`` / ``admin``. For more information on how to access
Grafana, please refer to :ref:`this procedure <installation-services-grafana>`

Changing Grafana username and password
--------------------------------------

To change the default username and password for Grafana on a MetalK8s cluster,
perform the following procedures:

#. Create a file named ``patch-secret.yaml`` that has the following content:

   .. code-block:: yaml

      stringData:
        admin-user: <username-in-clear>
        admin-password: <password-in-clear>

#. Apply the patch file by running:

   .. code-block:: shell

      $ kubectl --kubeconfig /etc/kubernetes/admin.conf patch secrets prometheus-operator-grafana --patch "$(cat patch-secret.yaml)" -n metalk8s-monitoring

#. Now, roll out the new updates for Grafana:

   .. code-block:: shell

      $ kubectl --kubeconfig /etc/kubernetes/admin.conf rollout restart deploy prometheus-operator-grafana -n metalk8s-monitoring

#. Access the Grafana instance and authenticate yourself using the new Account
   credentials.

  .. warning::

     During an upgrade or downgrade of a MetalK8s cluster, customized Grafana
     username and password will be overwritten with default credentials
     ``admin`` / ``admin``.

.. _ops-k8s-admin:

Administering MetalK8s GUI, Kubernetes API and Salt API
*******************************************************

During installation, MetalK8s configures the Kubernetes API to accept Basic
authentication, with default credentials ``admin`` / ``admin``.

Services exposed by MetalK8s, such as
:ref:`its GUI <installation-services-admin-ui>` or
:ref:`Salt API <installation-services-salt>`, rely on the Kubernetes API for
authenticating their users. As such, changing the credentials of a
Kubernetes API user will also change the credentials required to
connect to either one of these services.

.. _managing_kubernetes_api_username_password:

Managing Kubernetes API username and password
---------------------------------------------

  .. warning::

     The procedures mentioned below must be carried out on every control-plane
     :term:`Node`, or more specifically, any Node bearing the
     ``node-role.kubernetes.io/master`` label.

#. Edit the credentials file located at ``/etc/kubernetes/htpasswd``, replacing
   the username and/or password fields as below:

   .. code-block:: shell

      <password-in-clear>,<username-in-clear>,123,"system:masters"

#. Force a restart of the Kubernetes API server:

   .. code-block:: shell

      $ crictl stop \
          $(crictl ps -q --label io.kubernetes.pod.namespace=kube-system \
                         --label io.kubernetes.container.name=kube-apiserver \
                         --state Running)

#. Access a service (for example, MetalK8s GUI) and authenticate yourself
   using the new Account credentials.

   .. note::

      Upon changing the username and/or password, a fresh logout then login is
      required for accessing the MetalK8s GUI.

Accessing Cluster Services
==========================


.. _installation-services-admin-ui:

MetalK8s GUI
------------

This GUI is deployed during the :doc:`Bootstrap installation <./bootstrap>`,
and can be used for operating, extending and upgrading a MetalK8s cluster.

Gather Required Information
^^^^^^^^^^^^^^^^^^^^^^^^^^^
Get the ingress control plane IP.

.. code-block:: console

    root@bootstrap $ kubectl --kubeconfig=/etc/kubernetes/admin.conf \
      get svc -n metalk8s-ingress ingress-nginx-control-plane-controller \
      -o=jsonpath='{.spec.externalIPs[0]}{"\n"}'
    <the ingress control plane IP>

Use MetalK8s UI
^^^^^^^^^^^^^^^
Once you have gathered the IP address and the port number, open your
web browser and navigate to the URL ``https://<ip>:8443``, replacing
placeholders with the values retrieved before.

The login page is loaded, and should resemble the following:

.. image:: img/ui/login.png

.. _default-admin-login:

Log in with the default login / password
(``admin@metalk8s.invalid`` / ``password``).

  .. note::

     To change the default password as provided above, refer to
     :ref:`this procedure <change-dex-static-user-password>`.

The landing page should look like this:

.. image:: img/ui/monitoring.png

This page displays two monitoring indicators:

#. the Cluster Status, which evaluates if control plane services are all up and
   running
#. the list of alerts stored in :term:`Alertmanager`.


.. _installation-services-grafana:

Grafana
-------
Grafana is available on the same host as the MetalK8s UI, under ``/grafana``.
Log in with the default credentials: ``admin@metalk8s.invalid`` / ``password``.

.. _installation-services-salt:

Salt
----

.. _SaltStack: https://www.saltstack.com/

MetalK8s uses SaltStack_ to manage the cluster. The Salt Master runs in a
:term:`Pod` on the :term:`Bootstrap node`.

The Pod name is ``salt-master-<bootstrap hostname>``, and it contains two
containers: ``salt-master`` and ``salt-api``.

To interact with the Salt Master with the usual CLIs, open a terminal in the
``salt-master`` container (assuming the Bootstrap hostname to be
``bootstrap``):

.. code-block:: shell

   root@bootstrap $ kubectl exec -it -n kube-system -c salt-master \
                      --kubeconfig /etc/kubernetes/admin.conf \
                      salt-master-bootstrap bash

.. todo::

   - how to access / use SaltAPI
   - how to get logs from these containers

Accessing cluster services
==========================


.. _quickstart-services-admin-ui:

MetalK8s GUI
------------

This GUI is deployed during the :doc:`Bootstrap installation <./bootstrap>`,
and can be used for operating, extending and upgrading a MetalK8s cluster.

Gather required information
^^^^^^^^^^^^^^^^^^^^^^^^^^^
#. Get the workload plane IP of the bootstrap node.

   .. code-block:: shell

      root@bootstrap $ salt-call grains.get metalk8s:workload_plane_ip
      local:
          <the workload plane IP>

#. Retrieve the active ``NodePort`` number for the UI (here ``30923``):

   .. code-block:: shell

      root@boostrap $ kubectl --kubeconfig=/etc/kubernetes/admin.conf get svc metalk8s-ui -n metalk8s-ui

      NAME                  TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
      metalk8s-ui           NodePort    10.104.61.208   <none>        80:30923/TCP     3h


Use MetalK8s UI
^^^^^^^^^^^^^^^
Once you have gathered the IP address and the port number, open your
web browser and navigate to the URL ``http://<ip>:<port>``, replacing
placeholders with the values retrieved before.

The login page is loaded, and should resemble the following:

.. image:: img/ui/login.png

In the bottom left corner of the page, click the link
``Accept SSL Certificate for Kubernetes``. In the new tab, click the button
``Advanced...``, then select ``Accept the risk and continue``.

Follow the same steps for the second link, ``Accept SSL Certificate for Salt``.

Go back to the first tab, then log in with the default login / password
(admin / admin).

The landing page should look like this:

.. image:: img/ui/monitoring.png

This page displays two monitoring indicators:

#. the Cluster Status, which evaluates if control-plane services are all up and
   running
#. the list of alerts stored in :term:`Alertmanager`


.. _quickstart-services-grafana:

Grafana
-------

You will first need the latest ``kubectl`` version installed on your host.

To authenticate with the cluster, retrieve the admin kubeconfig on your host:

.. code-block:: shell

   user@your-host $ scp root@bootstrap:/etc/kubernetes/admin.conf ./admin.conf

Forward the port used by Grafana:

.. code-block:: shell

   user@your-host $ kubectl -n metalk8s-monitoring port-forward svc/prometheus-operator-grafana 3000:80

Then open your web browser and navigate to ``http://localhost:3000``


.. _quickstart-services-salt:

Salt
----

.. _SaltStack: https://www.saltstack.com/

MetalK8s uses SaltStack_ to manage the cluster. The Salt Master runs in a
:term:`Pod` on the :term:`Bootstrap node`.

The Pod name is ``salt-master-<bootstrap hostname>``, and it contains two
containers: ``salt-master`` and ``salt-api``.

To interact with the Salt Master with the usual CLIs, open a terminal in the
``salt-master`` container (we assume the Bootstrap hostname to be
``bootstrap``):

.. code-block:: shell

   root@bootstrap $ kubectl exec -it -n kube-system -c salt-master --kubeconfig /etc/kubernetes/admin.conf salt-master-bootstrap bash

.. todo::

   - how to access / use SaltAPI
   - how to get logs from these containers

Accessing cluster services
==========================


.. _quickstart-services-admin-ui:

MetalK8s GUI
------------

This GUI is deployed during the :doc:`Bootstrap installation <./bootstrap>`,
and can be used for operating, extending and upgrading a MetalK8s cluster.

.. todo:: Include screenshots

.. todo::

  The following test has been realized on vagrant only - One should list
  all requirements for reaching the UI using an operational cluster.


Gather required information
^^^^^^^^^^^^^^^^^^^^^^^^^^^
Run all following commands as ``root`` on the bootstrap node.
Get the workload plane IP of the bootstrap node.
On a Vagrant environment (see :doc:`/developer/building/local_cluster`), you
can obtain it with:
.. code-block:: shell

      $ ip a show eth1

Please note the IP address, then let's get the port number:

.. code-block:: shell

   $ kubectl --kubeconfig=/etc/kubernetes/admin.conf get svc metalk8s-ui -n kube-system

   NAME                  TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
   metalk8s-ui           NodePort    10.104.61.208   <none>        80:30923/TCP     3h

Please note the port used by metalk8s-ui (here ``30923``)


Use MetalK8s UI
^^^^^^^^^^^^^^^
Once you have gathered the IP address and the port number, open your
web browser and navigate to the URL ``http://<ip>:<port>``, replacing
placeholders with the values retrieved before.

The login page is loaded. At the bottom left on the page, click on the link
``Accept SSL Certificate``. On the new tab, click on the button ``Advanced...``
then on ``Accept the risk and continue``.
Go back on the first tab, then log in with the default login / password
(admin / admin).


.. _quickstart-services-grafana:

Grafana
-------

.. warning::

   The following test has been realized on Vagrant only - One should list
   all requirements for reaching the UI using an operational cluster.


You will first need the latest ``kubectl`` version installed on your host.

From the bootstrap node, get the port used by Grafana:

.. code-block:: shell

   [bootstrap]$ kubectl --kubeconfig=/etc/kubernetes/admin.conf get service grafana -n monitoring

   NAME      TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
   grafana   ClusterIP   10.109.125.193   <none>        3000/TCP   1h

Please note the port used by Grafana (here ``3000``)

To authenticate with the cluster, retrieve the admin kubeconfig on your host:

.. code-block:: shell

   [host]$ scp root@bootstrap:/etc/kubernetes/admin.conf ./admin.conf

Forward the port used by Grafana:

.. code-block:: shell

   [host]$ kubectl --namespace monitoring port-forward svc/grafana 3000

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

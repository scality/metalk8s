MetalK8s UI
===========


.. todo::

  The following test has been realized on vagrant only - One should list
  all requirements for reaching the UI using an operational cluster.


Gather required information
----------------------------

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
---------------

Once you have gathered the IP address and the port number, open your
web browser and navigate to the URL ``http://<ip>:<port>``, replacing
placeholders with the values retrieved before.

The login page is loaded. At the bottom left on the page, click on the link
``Accept SSL Certificate``. On the new tab, click on the button ``Advanced...``
then on ``Accept the risk and continue``.
Go back on the first tab, then log in with the default login / password
(admin / admin).

Grafana UI
==========


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

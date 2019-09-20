Accessing cluster services
==========================

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

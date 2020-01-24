Post-Installation Procedure
===========================

.. _Provision Prometheus Storage:

Provision Storage for Prometheus Services
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
After bootstrapping the cluster, the Prometheus and AlertManager services used
to monitor the system will not be running (the respective :term:`Pods <Pod>`
will remain in *Pending* state), because they require persistent storage to be
available.

You can either provision these storage volumes on the bootstrap
node, or later on other nodes joining the cluster. Templates for the required
volumes are available in :download:`examples/prometheus-sparse.yaml
<../../examples/prometheus-sparse.yaml>`.

Note, however, these templates use the `sparseLoopDevice` *Volume* type, which
is not suitable for production installations. Refer to :ref:`volume-management`
for more information on how to provision persistent storage.

.. note::

   When deploying using Vagrant, persistent volumes for Prometheus and
   AlertManager are already provisioned.

.. todo::

   - Explain in one sentence why it is needed
   - Procedure
   - Troubleshooting if needed

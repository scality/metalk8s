Running the storage operator locally
====================================

Requirements
------------

- `Go <https://golang.org/>`_ (1.12 or higher) and
  `operator-sdk <https://github.com/operator-framework/operator-sdk>`_ (0.9 or
  higher): to build the Kubernetes Operators
- `Mercurial <https://www.mercurial-scm.org/>`_: some Go dependencies are
  downloaded from Mercurial repositories.

Prerequisites
-------------

- You should have a running Metalk8s cluster somewhere
- You should have installed the dependencies locally with
  ``cd storage-operator; go mod download``

Procedure
---------

1. Copy the ``/etc/kubernetes/admin.conf`` from the bootstrap node of your
   cluster onto your local machine

2. Delete the already running storage operator, if any, with
   ``kubectl --kubeconfig /etc/kubernetes/admin.conf -n kube-system
   delete deployment storage-operator``

3. Get the address of the Salt API server with
   ``kubectl --kubeconfig /etc/kubernetes/admin.conf -n kube-system
   describe svc salt-master | grep :4507``

4. Run the storage operator with:

.. code-block:: console

   cd storage-operator
   export KUBECONFIG=<path-to-the-admin.cong-you-copied-locally>
   export METALK8S_SALT_MASTER_ADDRESS=http://<ADDRESS-OF-SALT-API>
   operator-sdk up local

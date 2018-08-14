:tocdepth: 1

Frequently Asked Questions
==========================

What to do when deployment fails at `install prometheus-operator`?
------------------------------------------------------------------
On slow networks or overloaded systems, the installation of
`prometheus-operator`_ can time-out which causes deployment to fail. When this
happens, some manual steps are required before the playbook can be restarted.

.. _prometheus-operator: https://github.com/coreos/prometheus-operator

Inside a :command:`make shell` environment with :envvar:`KUBECONFIG` set,
execute the following steps:

- Delete and purge the `prometheus-operator` Helm release:

  .. code:: shell

      helm delete --purge prometheus-operator

- Delete the `prometheus-operator-create-sm` `Job`:

  .. code:: shell

      kubectl --namespace=kube-ops delete job prometheus-operator-create-sm

  If the above command fails with `Error from server (NotFound)`, this is OK.

- Delete the `prometheus-operator-get-crd` `Job`:

  .. code:: shell

      kubectl --namespace=kube-ops delete job prometheus-operator-get-crd

  If the above command fails with `Error from server (NotFound)`, this is OK.

Once the above cleanup steps are executed, re-run the playbook to finalize
the deployment.

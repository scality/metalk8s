:tocdepth: 1

Frequently Asked Questions
==========================

Deployment failed at `install prometheus-operator`: what should I do?
---------------------------------------------------------------------
On slow networks or overloaded systems, `prometheus-operator`_ installation
can time out, causing the deployment to fail. If this happens, you must
follow these steps before restarting the playbook.

.. _prometheus-operator: https://github.com/coreos/prometheus-operator

1. Open a :command:`make shell` environment with :envvar:`KUBECONFIG` set.

2. Delete and purge the `prometheus-operator` Helm release:

  .. code:: shell

      helm delete --purge prometheus-operator

3. Delete the `prometheus-operator-create-sm` `Job`:

  .. code:: shell

      kubectl --namespace=kube-ops delete job prometheus-operator-create-sm

  If the above command fails with `Error from server (NotFound)`, this is OK.

4. Delete the `prometheus-operator-get-crd` `Job`:

  .. code:: shell

      kubectl --namespace=kube-ops delete job prometheus-operator-get-crd

  If the above command fails with `Error from server (NotFound)`, this is OK.

Re-run the playbook to finalize the deployment.


How can I keep a logfile of Ansible executions?
-----------------------------------------------
There are two ways to configure Ansible to keep a logfile:

- Set `log_path` in the `defaults` section of :file:`ansible.cfg`. Relative
  paths are relative to the location of :file:`ansible.cfg`.

- Export :envvar:`ANSIBLE_LOG_PATH` in the environment from which
  :command:`ansible-playbook` will be invoked.

For more information, see :ref:`ansible:DEFAULT_LOG_PATH`.


.. _ansible-user-root-detection:

Can I use the 'root' user to deploy MetalK8s to servers?
--------------------------------------------------------
During the deployment of MetalK8s, a set of tasks are executed to bring the
target system in line with the `RHEL7 STIG`_ security guidelines, using the
`ansible-hardening`_ role. STIG rule `V-72247`_ does not permit remote SSH
access using the `root` user. As such, if MetalK8s were deployed using `root`
to access a remote system, this would effectively disable access to said
server.

We integrated a check in the playbook to assert `ansible_user` is not set to
`root` on any of the target hosts to abort the deployment if this
configuration is detected.

To disable this security measure, set the `security_sshd_permit_root_login`_
variable to `true` on the relevant hosts or groups.

.. _RHEL7 STIG: https://www.stigviewer.com/stig/red_hat_enterprise_linux_7/
.. _ansible-hardening: https://docs.openstack.org/ansible-hardening/
.. _V-72247: https://www.stigviewer.com/stig/red_hat_enterprise_linux_7/2017-12-14/finding/V-72247
.. _security_sshd_permit_root_login: https://docs.openstack.org/ansible-hardening/latest/rhel7/domains/sshd.html#v-72247

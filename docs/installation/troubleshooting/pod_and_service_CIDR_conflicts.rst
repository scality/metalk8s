Pod and Service CIDR conflicts
==============================

If after installating a MetalK8s cluster you notice that the Pod-to-Pod
communication has routing issues, perform the following checks:

#. Check the configured values for the internal pod and service networks.

   .. code-block:: shell

      [root@bootstrap vagrant]# salt-call pillar.get networks
      local:
          ----------
          control_plane:
              172.21.254.0/28
          pod:
              10.233.0.0/16
          service:
              10.96.0.0/12
          workload_plane:
              172.21.254.32/27

#. Ensure that the configured IP ranges (CIDR notation) do not conflict
   with your infrastructure.

.. todo::

   - Add Salt master/minion logs, and explain how to run a specific state from
     the Salt master.
   - Add troubleshooting for networking issues.

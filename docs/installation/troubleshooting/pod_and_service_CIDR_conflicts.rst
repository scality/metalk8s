Pod and Service CIDR Conflicts
==============================

If, after installing a MetalK8s cluster you notice routing issues in
pod-to-pod communication:

#. Check the configured values for the internal pod and service networks.

   .. code-block:: shell

      [root@bootstrap]# salt-call pillar.get networks
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

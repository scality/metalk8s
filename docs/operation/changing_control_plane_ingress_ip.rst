Changing the Control Plane Ingress IP
=====================================

This procedure describes how to change the Control Plane Ingress IP, and
to enable (or disable) MetalLB management of this IP.

.. note::

  Disabling MetalLB using this procedure does **not** remove MetalLB,
  it simply disables its use for managing the ``LoadBalancer`` *Service*
  for MetalK8s Control Plane Ingress.

#. On the Bootstrap node, update the ``ip`` field from
   ``networks.controlPlane.ingress`` in the Bootstrap configuration file.
   (refer to :ref:`Bootstrap Configuration<Bootstrap Configuration>`)

#. Refresh the pillar.

   .. code-block:: console

     $ salt-call saltutil.refresh_pillar wait=True

#. Check that the change is taken into account.

   .. code-block:: console

      $ salt-call metalk8s_network.get_control_plane_ingress_ip
      local:
          <my-new-ip>
      $ salt-call pillar.get networks:control_plane
      local:
        ----------
        cidr:
          - <control-plane-cidr>
        ingress:
          ip:
            <my-new-ip>
        metalLB:
          enabled: <true | false>

#. On the Bootstrap node, reconfigure apiServer:

   .. parsed-literal::

     $ salt-call state.sls \\
         metalk8s.kubernetes.apiserver \\
         saltenv=metalk8s-|version|

#. Reconfigure Control Plane components:

   .. parsed-literal::

      $ kubectl exec -n kube-system -c salt-master \\
          --kubeconfig=/etc/kubernetes/admin.conf \\
          $(kubectl --kubeconfig=/etc/kubernetes/admin.conf get pod \\
          -l "app.kubernetes.io/name=salt-master" \\
          --namespace=kube-system -o jsonpath='{.items[0].metadata.name}')  \\
          -- salt-run state.orchestrate \\
          metalk8s.orchestrate.update-control-plane-ingress-ip \\
          saltenv=metalk8s-|version|

#. You can :ref:`access the MetalK8s GUI <installation-services-admin-ui>`
   using this new IP.

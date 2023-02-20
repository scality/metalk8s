Changing the Control Plane Ingress IP
=====================================

By default, the Control Plane Ingress is exposed on the Bootstrap node
Control Plane IP, which means that to have a highly available Control Plane
Ingress you need to set up a Load Balancer in front of this Control Plane
Ingress, that will check for the health of every Control Plane node and
redirect the traffic to a Control Plane node IP that is ready.

The MetalK8s Operator allows configuring a Virtual IP that will be managed
by MetalK8s and used to expose the Control Plane Ingress, so that you can
have a highly available Control Plane Ingress without Load Balancer in front.

This procedure describes how to change the Control Plane Ingress IP, and
to enable (or disable) management of this IP as a Virtual IP.

The ``ClusterConfig`` layout
----------------------------

.. code-block:: yaml

    apiVersion: metalk8s.scality.com/v1alpha1
    kind: ClusterConfig
    metadata:
      name: main
    spec:
      controlPlane:
        ingress:
          # Choose between
          # - `managedVirtualIP`: where you need to provide an IP that
          #                       will be manage by MetalK8s as a Virtual IP
          # - `externalIP`: where you need to provide the IP that will be
          #                 used to access the Ingress (e.g.: The Load Balancer IP)
          managedVirtualIP:
            address: 192.168.2.200
          # externalIP:
          #   address: 192.168.2.100

Procedure
---------

#. Update the ``main`` ``ClusterConfig`` object as you wish

    .. code-block:: console

        kubectl --kubeconfig=/etc/kubernetes/admin.conf \
            edit clusterconfig main

#. Wait for the ``ClusterConfig`` to be ready

    .. code-block:: console

        kubectl --kubeconfig=/etc/kubernetes/admin.conf \
            wait --for=condition=Ready \
            clusterconfig main

#. Refresh the pillar.

   .. code-block:: console

     $ salt-call saltutil.refresh_pillar wait=True

#. Check that the change is taken into account.

   .. code-block:: console

      $ salt-call metalk8s_network.get_control_plane_ingress_ip
      local:
          <my-new-ip>

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

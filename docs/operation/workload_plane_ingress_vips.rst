The Workload Plane Ingress Virtual IPs
======================================


By default, the Workload Plane Ingress is exposed on every node Workload Plane
IP, which means that to have a highly available Workload Plane Ingress you
need to set up a Load Balancer in front of this Workload Plane Ingress, that
will check for the health of every Workload Plane node and redirect the traffic
to a Workload Plane node IP that is ready.

The MetalK8s Operator allows configuring some Virtual IPs that will be managed
by MetalK8s and used to expose the Workload Plane Ingress, so that you can
have a highly available Workload Plane Ingress without Load Balancer in front.

.. note::

    The Load Balancer setup is still better in terms of performance, because
    the traffic will be spread appropriately on nodes even if there is a node
    that goes down.

You can add, remove, change the Virtual IPs at any point in time just by
editing the ``main`` ``ClusterConfig`` object and running 2 salt commands.

.. warning::

    Any extra ``ClusterConfig`` created will be automatically deleted, you
    really need to edit the ``main`` one.

The ``ClusterConfig`` layout
----------------------------

.. code-block:: yaml

    apiVersion: metalk8s.scality.com/v1alpha1
    kind: ClusterConfig
    metadata:
      name: main
    spec:
      workloadPlane:
        virtualIPPools:
          # An arbitrary name for the pool
          # that will be used as Kubernetes object name
          default:
            # Classic nodeSelector to select on which node the
            # Virtual IPs should be deployed
            nodeSelector: {}
            # Tolerations that are needed to run the Pod on the nodes
            tolerations: {}
            # A list of Virtual IPs that will be managed by the product
            # There is no constraint on the number of Virtual IPs
            addresses:
              - 192.168.1.200
              - 192.168.1.201
              - 192.168.1.202

.. note::

    The Virtual IPs will be automatically spread on every nodes.

Updating a pool
---------------

#. Update the ``main`` ``ClusterConfig`` object as you wish.

    .. code-block:: console

        kubectl --kubeconfig=/etc/kubernetes/admin.conf \
            edit clusterconfig main

#. Wait for the ``ClusterConfig`` to be ready

    .. code-block:: console

        kubectl --kubeconfig=/etc/kubernetes/admin.conf \
            wait --for=condition=Ready \
            clusterconfig main

#. Reconfigure the CNI to expose the Ingress on the new Virtual IPs

    .. parsed-literal::

        kubectl exec -n kube-system -c salt-master \\
            --kubeconfig /etc/kubernetes/admin.conf \\
            $(kubectl --kubeconfig /etc/kubernetes/admin.conf \\
                get pods -n kube-system -l app=salt-master -o name) \\
            -- salt-run state.sls metalk8s.kubernetes.cni.calico.deployed \\
            saltenv=metalk8s-|version|

#. Regenerate the Workload Plane Ingress server certificate

    .. parsed-literal::

        kubectl exec -n kube-system -c salt-master \\
            --kubeconfig /etc/kubernetes/admin.conf \\
            $(kubectl --kubeconfig /etc/kubernetes/admin.conf \\
                get pods -n kube-system -l app=salt-master -o name) \\
            -- salt '*' state.sls metalk8s.addons.nginx-ingress.certs \\
            saltenv=metalk8s-|version|

#. Restart the Workload Plane Ingress controller

    .. code-block:: console

        kubectl --kubeconfig=/etc/kubernetes/admin.conf \
            rollout restart -n metalk8s-ingress \
            daemonset ingress-nginx-controller

#. Wait for the Workload Plane Ingress controller restart to be completed

    .. code-block:: console

        kubectl --kubeconfig=/etc/kubernetes/admin.conf \
            rollout status -n metalk8s-ingress \
            daemonset ingress-nginx-controller \
            --timeout 5m

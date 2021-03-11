General Kubernetes Resource Errors
==================================

Pod status shows **CrashLoopBackOff**
-------------------------------------

If you notice that some pods are in a state of **CrashLoopBackOf**, it means
that the pods are crashing because they start up then immediately exit. So,
Kubernetes restarts them and the cycle continues.
To find out the potential cause of this error, run the following commands and
inspect the output.

.. code-block:: shell

   [root@bootstrap vagrant]# kubectl -n kube-system describe pods <pod name>
    Name:                 <pod name>
    Namespace:            kube-system
    Priority:             2000000000
    Priority Class Name:  system-cluster-critical

Persistent Volume Claim (PVC) stuck in **Pending** state
--------------------------------------------------------

If after provisioning a volume for a pod (e.g. Prometheus) the PVC still
hangs in a **Pending** state, perform the following checks:

#. Check that the volumes have been provisioned and are in a **Ready** state.

   .. code-block:: shell

      kubectl describe volume <volume-name>
      [root@bootstrap vagrant]# kubectl describe volume test-volume
       Name:         <volume-name>
       Status:
         Conditions:
           Last Transition Time:  2020-01-14T12:57:56Z
           Last Update Time:      2020-01-14T12:57:56Z
           Status:                True
           Type:                  Ready

#. Check that a corresponding PersistentVolume exists.

   .. code-block:: shell

      [root@bootstrap vagrant]# kubectl get pv
      NAME                     CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS  STORAGECLASS             AGE       CLAIM
      <volume-name>              10Gi       RWO            Retain          Bound  <storage-class-name>     4d22h     <persistentvolume-claim-name>

#. Check that the PersistentVolume matches the PersistentVolume Claim
   constraints (size, labels, storage class).

   - Find the name of your PersistentVolume Claim:

     .. code-block:: shell

        [root@bootstrap vagrant]# kubectl get pvc -n <namespace>
        NAME                             STATUS   VOLUME                 CAPACITY   ACCESS MODES   STORAGECLASS          AGE
        <persistent-volume-claim-name>   Bound    <volume-name>          10Gi       RWO            <storage-class-name>  24h

   - Check if the PersistentVolume Claim constraints match:

     .. code-block:: shell

        [root@bootstrap vagrant]# kubectl describe pvc <persistevolume-claim-name> -n <namespace>
        Name:          <persistentvolume-claim-name>
        Namespace:     <namespace>
        StorageClass:  <storage-class-name>
        Status:        Bound
        Volume:        <volume-name>
        Capacity:      10Gi
        Access Modes:  RWO
        VolumeMode:    Filesystem

#. If no PersistentVolume exists, check that the storage operator is up
   and running.

   .. code-block:: shell

      [root@bootstrap vagrant]# kubectl -n kube-system get deployments storage-operator
      NAME               READY   UP-TO-DATE   AVAILABLE   AGE
      storage-operator   1/1     1            1           4d22h

Access to MetalK8s GUI fails with "undefined backend"
-----------------------------------------------------

If you encounter an "undefined backend" error while using the MetalK8s GUI,
perform the following checks:

#. Check that the Ingress pods are running.

   .. code-block:: shell

      [root@bootstrap vagrant]#  kubectl -n metalk8s-ingress get daemonsets
      NAME                                     DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR                     AGE
      nginx-ingress-control-plane-controller   1         1         1       1            1           node-role.kubernetes.io/master=   4d22h
      nginx-ingress-controller                 1         1         1       1            1           <none>                            4d22h

#. Check the Ingress controller logs.

   .. code-block:: shell

      [root@bootstrap vagrant]# kubectl logs -n metalk8s-ingress nginx-ingress-control-plane-controller-ftg6v
       -------------------------------------------------------------------------------
       NGINX Ingress controller
         Release:       0.26.1
         Build:         git-2de5a893a
         Repository:    https://github.com/kubernetes/ingress-nginx
         nginx version: openresty/1.15.8.2

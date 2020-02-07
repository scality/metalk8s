
.. _Troubleshooting Guide:

Troubleshooting Guide
^^^^^^^^^^^^^^^^^^^^^

This section highlights some of the common problems users face during and
after a MetalK8s installation. If you do not find a solution to a problem you
are facing, please reach out to **Scality support** or create a
`Github issue <https://github.com/scality/metalk8s/issues>`_.

Bootstrap Installation Errors
+++++++++++++++++++++++++++++

Bootstrap Installation fails with no straightforward reason
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
If during a MetalK8s installation you encounter a failure and the console
output does not provide sufficient information in order to pin-point the cause
of failure, then re-run the installation with the verbose flag (``--verbose``).

.. parsed-literal::

   root@bootstrap $ /srv/scality/metalk8s-|release|/bootstrap.sh --verbose

Errors after restarting the Bootstrap node
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
If you reboot the Bootstrap node and for some reason, some containers
(especially the salt-master container) refuses to start then perform the
following checks:

- Check and ensure that the **MetalK8s ISO** is mounted properly.

  .. parsed-literal::

     [root@bootstrap vagrant]# mount | grep /srv/scality/metalk8s-|release|
     /home/centos/metalk8s.iso on /srv/scality/metalk8s-|release| type iso9660 (ro,relatime)


- If the ISO is unmounted, run the following command which will check the
  the status of the ISO file and remount it automatically.

  .. parsed-literal::

     [root@bootstrap vagrant]# salt-call state.sls metalk8s.archives.mounted saltenv=metalk8s-|release|
      Summary for local
      ------------
      Succeeded: 3
      Failed:    0

Bootstrap fails and console log is unscrollable
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
If during a MetalK8s installation, the Bootstrap process fails and the console
output is unscrollable then you can consult the Bootstrap logs in
``/var/log/metalk8s-bootstrap.log``.

Account Administration Errors
+++++++++++++++++++++++++++++

Forgot the MetalK8s GUI password
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
If you forget the MetalK8s GUI username and/or password combination,
follow :ref:`this procedure <ops-k8s-admin>` to reset or change it.

General Kubernetes Resource Errors
++++++++++++++++++++++++++++++++++

Pod status shows "CrashLoopBackOff"
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If after a MetalK8s installation, you notice some Pods are in a state of
"CrashLoopBackOff", then it means pods are crashing because they start up then
immediately exit, thus Kubernetes restarts them and the cycle continues.
To get possible clues about this error, run the following commands and inspect
the output.

.. code-block:: shell

   [root@bootstrap vagrant]# kubectl -n kube-system describe pods <pod name>
    Name:                 <pod name>
    Namespace:            kube-system
    Priority:             2000000000
    Priority Class Name:  system-cluster-critical

Persistent Volume Claim(PVC) stuck in "Pending" state
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If after provisioning a Volume for a Pod (e.g. Prometheus) and the PVC still
hangs in a **Pending** state, then try checking the following:

- Check that the volumes have been provisioned and are in a **Ready** state:

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

- Check that a corresponding PersistentVolume exist:

  .. code-block:: shell

     [root@bootstrap vagrant]# kubectl get pv
     NAME                     CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS  STORAGECLASS             AGE       CLAIM
     <volume-name>              10Gi       RWO            Retain          Bound  <storage-class-name>     4d22h     <persistentvolume-claim-name>

- Check that the PersistentVolume matches the PersistentVolume Claim
  constraints (size, labels, storage class) by doing the following:

  - Find the name of your PersistentVolume Claim:

    .. code-block:: shell

       [root@bootstrap vagrant]# kubectl get pvc -n <namespace>
       NAME                             STATUS   VOLUME                 CAPACITY   ACCESS MODES   STORAGECLASS          AGE
       <persistent-volume-claim-name>   Bound    <volume-name>          10Gi       RWO            <storage-class-name>  24h

  - Then check the PersistentVolume Claim constraints if they match:

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

- If no PersistentVolume exist, then check that the storage operator is up
  and running.

  .. code-block:: shell

     [root@bootstrap vagrant]# kubectl -n kube-system get deployments storage-operator
     NAME               READY   UP-TO-DATE   AVAILABLE   AGE
     storage-operator   1/1     1            1           4d22h

Access to MetalK8s GUI fails with "undefined backend"
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
If in the cause of using the MetalK8s GUI, you encounter an "undefined
backend" error then perform the following checks:

- Check that the Ingress pods are running:

  .. code-block:: shell

     [root@bootstrap vagrant]#  kubectl -n metalk8s-ingress get daemonsets
     NAME                                     DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR                     AGE
     nginx-ingress-control-plane-controller   1         1         1       1            1           node-role.kubernetes.io/master=   4d22h
     nginx-ingress-controller                 1         1         1       1            1           <none>                            4d22h

- Check the Ingress controller logs:

  .. code-block:: shell

     [root@bootstrap vagrant]# kubectl logs -n metalk8s-ingress nginx-ingress-control-plane-controller-ftg6v
      -------------------------------------------------------------------------------
      NGINX Ingress controller
        Release:       0.26.1
        Build:         git-2de5a893a
        Repository:    https://github.com/kubernetes/ingress-nginx
        nginx version: openresty/1.15.8.2

Pod and Service CIDR conflicts
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
If after installation of a MetalK8s cluster you notice that Pod-to-Pod
communication has routing problems, perform the following:

- Check the configured values for the internal Pod and Service networks:

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

  Make sure the configured IP ranges (CIDR notation) do not conflict with your
  infrastructure.

.. todo::

   - Add Salt master/minion logs, and explain how to run a specific state from
     the Salt master.
   - Add troubleshooting for networking issues.

StorageClass Creation
=====================
**MetalK8s** makes use of StorageClasses in other to provision and use
persistent volumes.
This section hightlights how to create a Storageclass using the **CLI** only.

Volume objects require a storageclass object to function properly. To create a
storageclass object, perform the following steps.

#. Create a storage class defintion.

   Save the storage class definition example file as **storageclass.yaml**.

   .. code-block:: shell

       apiVersion: storage.k8s.io/v1
       kind: StorageClass
       metadata:
         name: <storageclass_name>
       provisioner: kubernetes.io/no-provisioner
       reclaimPolicy: Retain
       volumeBindingMode: WaitForFirstConsumer
       mountOptions:
         - rw
       parameters:
         fsType: <filesystem_type>
         mkfsOptions: '["-m", "0"]'

  .. tip::

      Always set **WaitForFirstConsumer** as **volumeBindingMode** so as to
      delay the binding and provisioning of a PersistentVolume until a Pod
      using the PersistentVolumeClaim is created.

#. Apply the storageclass.

   .. code-block:: shell

      root@bootstrap $ kubectl apply -f storageclass.yml

#. Verify that the storageclass was created.

   .. code-block:: shell

      root@bootstrap $ kubectl get storageclass metalk8s-demo-storageclass

      [root@bootstrap]# kubectl get storageclass metalk8s-demo-storageclass
      NAME                         PROVISIONER                    AGE
      metalk8s-demo-storageclass   kubernetes.io/no-provisioner   2s

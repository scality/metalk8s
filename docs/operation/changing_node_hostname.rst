Changing the hostname of a MetalK8s node
========================================


#. On the node, change the hostname:

   .. code-block:: shell

      $ hostnamectl set-hostname <New hostname>
      $ systemctl restart systemd-hostnamed

#. Check that the change is taken into account.

   .. code-block:: shell

      $ hostnamectl status

      Static hostname: <New hostname>
      Pretty hostname: <New hostname>
        Icon name: computer-vm
         Chassis: vm
      Machine ID: 5003025f93c1a84914ea5ae66519c100
         Boot ID: f28d5c64f06c48a3a775e24c4f03d00c
         Virtualization: kvm
      Oerating System: CentOS Linux 7 (Core)
         CPE OS Name: cpe:/o:centos:centos:7
             Kernel: Linux 3.10.0-957.12.2.el7.x86_64
         Architecture: x86-64


#. On the bootstrap node, check the hostname edition incurred a change of
   status on the bootstrap. The edited node must be in a **NotReady** status.

   .. code-block:: shell

      $ kubectl get <node_name>
      <node_name>    NotReady   etcd,master                   19h       v1.11.7

#. Change the name of the node in the ``yaml`` file used to create it.
   Refer to :ref:`quickstart-expansion-manifest` for more information.

   .. parsed-literal::

      apiVersion: v1
      kind: Node
      metadata:
        name: <New_node_name>
        annotations:
          metalk8s.scality.com/ssh-key-path: /etc/metalk8s/pki/salt-bootstrap
          metalk8s.scality.com/ssh-host: <node control-plane IP>
          metalk8s.scality.com/ssh-sudo: 'false'
        labels:
          metalk8s.scality.com/version: '|release|'
          <role labels>
      spec:
        taints: <taints>

   Then apply the configuration:

   .. code-block:: shell

      $ kubectl apply -f <path to edited manifest>

#. Delete the old node (here ``<node_name>``):

   .. code-block:: shell

      $ kubectl delete node <node_name>

#. Open a terminal into the :term:`Salt master` container:

   .. code-block:: shell

      $ kubectl -it exec salt-master-<bootstrap_node_name> -n kube-system -c salt-master bash

#. Delete the now obsolete :term:`Salt minion` key for the changed Node:

   .. code-block:: shell

      $ salt-key -d <node_name>

#. Re-run the deployment for the edited Node:

   .. parsed-literal::

     $ salt-run state.orchestrate metalk8s.orchestrate.deploy_node \
       saltenv=metalk8s-|release| \
       pillar='{"orchestrate": {"node_name": "<new-node-name>"}}'


          Summary for bootstrap_master
          -------------
          Succeeded: 11 (changed=9)
          Failed:     0
          -------------
          Total states run:     11
          Total run time:  132.435 s

#. On the edited node, restart the :term:`kubelet` service:

   .. code-block:: shell

      $ systemctl restart kubelet


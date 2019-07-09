Changing the hostname of a MetalK8s node
========================================


#. On the node, change the hostname:

   .. code-block:: shell

      $ hostnamectl set-hostname <New hostname>
      $ systemctl restart systemd-hostnamed

#. Check that the change is taken into account.

   .. code-block:: shell

      $ hostnamectl status

      Static hostname: controlplane2
      Pretty hostname: ControlPlane2
        Icon name: computer-vm
         Chassis: vm
      Machine ID: 5003025f93c1a84914ea5ae66519c100
         Boot ID: f28d5c64f06c48a3a775e24c4f03d00c
         Virtualization: kvm
      Oerating System: CentOS Linux 7 (Core)
         CPE OS Name: cpe:/o:centos:centos:7
             Kernel: Linux 3.10.0-957.12.2.el7.x86_64
         Architecture: x86-64


#. On the bootstrap node, check the hostname edition allowed a change of status
   on the bootstrap. The node must be in a **NotReady** status.

   .. code-block:: shell

      $ kubectl get nodes
      node2    NotReady   etcd,master                   19h       v1.11.7

#. Change the name of the node in the ``yaml`` file used to create it.

   .. code-block:: yaml

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

      $ kubectl apply -f new-node-creation.yaml

#. Delete the old node (here ``node2``):

   .. code-block:: shell

      $ kubectl delete node node2

#. Log on the salt master:

   .. code-block:: shell

      $ kubectl -it -n kube-system exec salt-master-bootstrap bash

#. Delete the old node key:

   .. code-block:: shell

      $ salt-key -d <node_key_name>

#. Run the new node name deployment:

   .. code-block:: shell

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

#. On the bootstrap node, restart the kubelet service:

   .. code-block:: shell

      $ systemctl restart kubelet


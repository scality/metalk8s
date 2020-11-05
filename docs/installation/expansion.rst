Cluster expansion
=================

.. _`kubeadm join`:
      https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-join/
.. _`bootstrap tokens`:
      https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet-tls-bootstrapping/

.. |kubeadm join| replace:: ``kubeadm join``

Once the :term:`Bootstrap node` has been installed
(see :doc:`./bootstrap`), the cluster can be expanded.
Unlike the |kubeadm join|_ approach which relies on `bootstrap tokens`_ and
manual operations on each node, MetalK8s uses Salt SSH to setup new
:term:`Nodes <Node>` through declarative configuration,
from a single entrypoint. This operation can be done either through
:ref:`the MetalK8s GUI <installation-expansion-ui>` or
:ref:`the command-line <installation-expansion-cli>`.

Defining an Architecture
------------------------
Follow the recommendations provided in
:ref:`the introduction<installation-intro-architecture>` to choose an
architecture.

List the machines to deploy and their associated roles, and deploy each of them
using the following process, either from
:ref:`the GUI<installation-expansion-ui>` or
:ref:`CLI<installation-expansion-cli>`. Note however, that the finest control
over :ref:`roles<node-roles>` and :ref:`taints<node-taints>` can only be
achieved using the command-line.

.. _installation-expansion-ui:

Adding a Node with the :ref:`MetalK8s GUI <installation-services-admin-ui>`
---------------------------------------------------------------------------
To reach the UI, refer to
:ref:`this procedure <installation-services-admin-ui>`.

Creating a Node Object
^^^^^^^^^^^^^^^^^^^^^^
The first step to adding a Node to a cluster is to declare it in the API.
The MetalK8s GUI provides a simple form for that purpose.

#. Navigate to the Node list page, by clicking the button in the sidebar:

   .. image:: img/ui/click-node-list.png

#. From the Node list (the Bootstrap node should be visible there), click the
   button labeled "Create a New Node":

   .. image:: img/ui/click-create-node.png

#. Fill the form with relevant information (make sure the
   :ref:`SSH provisioning <Bootstrap SSH Provisioning>` for the Bootstrap node
   is done first):

   - **Name**: the hostname of the new Node
   - **SSH User**: the user for which the Bootstrap has SSH access
   - **Hostname or IP**: the address to use for SSH from the Bootstrap
   - **SSH Port**: the port to use for SSH from the Bootstrap
   - **SSH Key Path**: the path to the private key generated in
     :ref:`this procedure <Bootstrap SSH Provisioning>`
   - **Sudo required**: whether the SSH deployment will need ``sudo`` access
   - **Roles/Workload Plane**: enable any workload applications
     run on this Node
   - **Roles/Control Plane**: enable master and etcd services run on this Node
   - **Roles/Infra**: enable infra services run on this Node

   .. note::

      Combination of multiple roles is possible:
      Selecting **Workload Plane** and **Infra** checkbox will result in infra
      services and workload applications run on this Node.

#. Click **Create**. You will be redirected to the Node list page, and will be
   shown a notification to confirm the Node creation:

   .. image:: img/ui/notification-node-created.png


Deploying the Node
^^^^^^^^^^^^^^^^^^
After the desired state has been declared, it can be applied to the machine.
The MetalK8s GUI uses :term:`SaltAPI` to orchestrate the deployment.

#. From the Node list page, click the **Deploy** button for any Node
   that has not yet been deployed.

   .. image:: img/ui/click-node-deploy.png

   Once clicked, the button changes to **Deploying**. Click it again to
   open the deployment status page:

   .. image:: img/ui/deployment-progress.png

   Detailed events are shown on the right of this page, for advanced users to
   debug in case of errors.

   .. todo::

      - UI should parse these events further
      - Events should be documented

#. When deployment is complete, click **Back to nodes list**. The new Node
   should be in a **Ready** state.

.. todo::

   - troubleshooting (example errors)


.. _installation-expansion-cli:

Adding a Node from the Command-line
-----------------------------------

.. _installation-expansion-manifest:

Creating a Manifest
^^^^^^^^^^^^^^^^^^^
Adding a node requires the creation of a :term:`manifest <Node manifest>` file,
following the template below:

.. parsed-literal::

   apiVersion: v1
   kind: Node
   metadata:
     name: <node_name>
     annotations:
       metalk8s.scality.com/ssh-key-path: /etc/metalk8s/pki/salt-bootstrap
       metalk8s.scality.com/ssh-host: <node control plane IP>
       metalk8s.scality.com/ssh-sudo: 'false'
     labels:
       metalk8s.scality.com/version: '|version|'
       <role labels>
   spec:
     taints: <taints>

The combination of ``<role labels>`` and ``<taints>`` will determine what is
installed and deployed on the Node.

:ref:`roles <node-roles>` determine a Node responsibilities.
:ref:`taints <node-taints>` are complementary to roles.

- A node exclusively in the control plane with ``etcd`` storage

  roles and taints both are set to master and etcd.
  It has the same behavior as the **Control Plane** checkbox in the GUI.

.. code-block:: yaml

   […]
   metadata:
     […]
     labels:
       node-role.kubernetes.io/master: ''
       node-role.kubernetes.io/etcd: ''
       [… (other labels except roles)]
   spec:
     […]
     taints:
     - effect: NoSchedule
       key: node-role.kubernetes.io/master
     - effect: NoSchedule
       key: node-role.kubernetes.io/etcd

- A worker node dedicated to ``infra`` services (see :doc:`./introduction`)

  roles and taints both are set to infra. It has the same behavior as the
  **Infra** checkbox in the GUI.

.. code-block:: yaml

   […]
   metadata:
     […]
     labels:
       node-role.kubernetes.io/infra: ''
       [… (other labels except roles)]
   spec:
     […]
     taints:
     - effect: NoSchedule
       key: node-role.kubernetes.io/infra

- A simple worker still accepting ``infra`` services
  would use the same role label without the taint

  roles are set to node and infra. It's the same as the checkbox of
  Workload Plane and Infra in MetalK8s GUI.

CLI-only actions
^^^^^^^^^^^^^^^^
- A Node dedicated to etcd

  roles and taints both are set to etcd.

.. code-block:: yaml

   […]
   metadata:
     […]
     labels:
       node-role.kubernetes.io/etcd: ''
       [… (other labels except roles)]
   spec:
     […]
     taints:
     - effect: NoSchedule
       key: node-role.kubernetes.io/etcd

Creating the Node Object
^^^^^^^^^^^^^^^^^^^^^^^^
Use ``kubectl`` to send the manifest file created before to Kubernetes API.

.. code-block:: shell

   root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf apply -f <path-to-node-manifest>
   node/<node-name> created

Check that it is available in the API and has the expected roles.

.. code-block:: shell

   root@bootstrap $ kubectl --kubeconfig /etc/kubernetes/admin.conf get nodes
   NAME                   STATUS    ROLES                         AGE       VERSION
   bootstrap              Ready     bootstrap,etcd,infra,master   12d       v1.11.7
   <node-name>            Unknown   <expected node roles>         29s

Deploying the Node
^^^^^^^^^^^^^^^^^^
Open a terminal in the Salt Master container using
:ref:`this procedure <installation-services-salt>`.

#. Check that SSH access from the Salt Master to the new node is properly
   configured (see :ref:`Bootstrap SSH Provisioning`).

   .. code-block:: shell

      root@salt-master-bootstrap $ salt-ssh --roster kubernetes <node-name> test.ping
      <node-name>:
          True

#. Start the node deployment.

   .. parsed-literal::

      root@salt-master-bootstrap $ salt-run state.orchestrate metalk8s.orchestrate.deploy_node \\
                                   saltenv=metalk8s-|version| \\
                                   pillar='{"orchestrate": {"node_name": "<node-name>"}}'

      ... lots of output ...
      Summary for bootstrap_master
      ------------
      Succeeded: 7 (changed=7)
      Failed:    0
      ------------
      Total states run:     7
      Total run time: 121.468 s

.. todo::

   Troubleshooting section

   - explain orchestrate output and how to find errors
   - point to log files


Checking Cluster Health
-----------------------

During the expansion, it is recommended to check the cluster state between each
node addition.

When expanding the control plane, one can check the etcd cluster health:

.. code-block:: shell

   root@bootstrap $ kubectl -n kube-system exec -ti etcd-bootstrap sh --kubeconfig /etc/kubernetes/admin.conf
   root@etcd-bootstrap $ etcdctl --endpoints=https://[127.0.0.1]:2379 \
                         --cacert=/etc/kubernetes/pki/etcd/ca.crt \
                         --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
                         --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
                         endpoint health --cluster

     https://<first-node-ip>:2379 is healthy: successfully committed proposal: took = 16.285672ms
     https://<second-node-ip>:2379 is healthy: successfully committed proposal: took = 43.462092ms
     https://<third-node-ip>:2379 is healthy: successfully committed proposal: took = 52.879358ms

.. todo::

   - add sanity checks for Pods lists (also in the relevant sections in
     services)

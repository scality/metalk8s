Setup of the environment
========================

.. _MetalK8s: https://github.com/scality/metalk8s
.. _CentOS: https://www.centos.org
.. _RHEL: https://access.redhat.com/products/red-hat-enterprise-linux

General requirements
--------------------

MetalK8s_ clusters require machines running CentOS_ / RHEL_ 7.6 or higher as
their operating system. These machines may be virtual or physical, with no
difference in setup procedure.

For this quickstart, we will need 5 machines (or 3, if running workload
applications on your control-plane nodes).

Sizing
^^^^^^
Each machine should have at least 2 CPU cores, 4 GB of RAM, and a root
partition larger than 40 GB.

For sizing recommendations depending on sample use cases, see the
:doc:`Installation guide </installation-guide/sizing>`.

Proxies
^^^^^^^
For nodes operating behind a proxy, add the following lines to each cluster
member's :file:`/etc/environment` file:

.. code-block:: shell

   http_proxy=http://user;pass@<HTTP proxy IP address>:<port>
   https_proxy=http://user;pass@<HTTPS proxy IP address>:<port>
   no_proxy=localhost,127.0.0.1,<local IP of each node>

SSH provisioning
^^^^^^^^^^^^^^^^
Each machine should be accessible through SSH from your host. As part of the
:doc:`./bootstrap`, a new SSH identity for the :term:`Bootstrap node` will be
generated and shared to other nodes in the cluster. It is also possible to do
it beforehand.

Network provisioning
^^^^^^^^^^^^^^^^^^^^
Each machine needs to be a member of both the control-plane and workload-plane
networks, as described in :ref:`quickstart-intro-networks`. However, these
networks can overlap, and nodes need not have distinct IPs for each plane.

In order to reach the cluster-provided UIs from your host, the host needs to be
able to connect to workload-plane IPs of the machines.


Example OpenStack deployment
----------------------------

.. todo:: Extract the Terraform tooling used in CI for ease of use.

Prerequisites
=============

.. _MetalK8s: https://github.com/scality/metalk8s
.. _CentOS: https://www.centos.org
.. _RHEL: https://access.redhat.com/products/red-hat-enterprise-linux
.. _RHSM register: https://access.redhat.com/solutions/253273
.. _Enable Optional repositories with RHSM: https://access.redhat.com/solutions/392003
.. _Configure repositories with YUM: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/system_administrators_guide/sec-configuring_yum_and_yum_repositories#sec-Managing_Yum_Repositories
.. _Advanced repositories configuration: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/system_administrators_guide/sec-configuring_yum_and_yum_repositories#sec-Setting_repository_Options

MetalK8s_ clusters require machines running CentOS_ / RHEL_ 7.6 or higher as
their operating system. These machines may be virtual or physical, with no
difference in setup procedure.

For this quickstart, we will need 5 machines (or 3, if running workload
applications on your control-plane nodes).

Sizing
------
Each machine should have at least 2 CPU cores, 4 GB of RAM, and a root
partition larger than 40 GB.

Proxies
-------
For nodes operating behind a proxy, see :ref:`Bootstrap Configuration`

Provisioning
------------

SSH
^^^
Each machine should be accessible through SSH from your host. As part of the
:doc:`./bootstrap`, a new SSH identity for the :term:`Bootstrap node` will be
generated and shared to other nodes in the cluster. It is also possible to do
it beforehand.

Network
^^^^^^^
Each machine needs to be a member of both the control-plane and workload-plane
networks, as described in :ref:`quickstart-intro-networks`. However, these
networks can overlap, and nodes need not have distinct IPs for each plane.

In order to reach the cluster-provided UIs from your host, the host needs to be
able to connect to workload-plane IPs of the machines.

Repositories
^^^^^^^^^^^^
Each machine needs to have repositories properly configured and having access
to basic repository packages (depending on the operating systems).

CentOS_:

    - base
    - extras
    - updates

RHEL_:

    - rhel-7-server-rpms
    - rhel-7-server-extras-rpms
    - rhel-7-server-optional-rpms

    .. note::

        For RHEL_ you should have
        `a system properly registered <RHSM register_>`_.

.. note::

    The repository names and configurations do not necessarily need to be the
    same as the official ones but all packages must be made available.

Enable an existing repository:

    CentOS_:

        .. code-block:: shell

            yum-config-manager --enable <repo_name>

    RHEL_:

        .. code-block:: shell

            subscription-manager repos --enable=<repo_name>

Add a new repository:

    .. code-block:: shell

        yum-config-manager --add-repo <repo_url>

    .. note::

        `repo_url` can be remote url using prefix `http://`, `https://`,
        `ftp://`, ... or a local path using `file://`.

For more detail(s), refer to the official documentation:

    - `Enable Optional repositories with RHSM`_
    - `Configure repositories with YUM`_
    - `Advanced repositories configuration`_

Example OpenStack deployment
----------------------------

.. todo:: Extract the Terraform tooling used in CI for ease of use.

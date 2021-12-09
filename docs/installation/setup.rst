Prerequisites
=============

.. _MetalK8s: https://github.com/scality/metalk8s
.. _CentOS: https://www.centos.org
.. _RHEL: https://access.redhat.com/products/red-hat-enterprise-linux
.. _RHSM register: https://access.redhat.com/solutions/253273
.. _Enable Optional repositories with RHSM: https://access.redhat.com/solutions/392003
.. _Configure repositories with YUM: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/system_administrators_guide/sec-configuring_yum_and_yum_repositories#sec-Managing_Yum_Repositories
.. _Advanced repositories configuration: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/system_administrators_guide/sec-configuring_yum_and_yum_repositories#sec-Setting_repository_Options
.. _SaltStack: https://www.saltstack.com
.. _Puppet: https://puppet.com

MetalK8s_ clusters require machines running CentOS_\/RHEL_ 7.6 or higher as
their operating system. These machines may be virtual or physical, with no
difference in setup procedure. The number of machines to set up depends on the
architecture you chose in :ref:`installation-intro-architecture`.

Machines *must not* be managed by any configuration management system, such as
SaltStack_ or Puppet_.

    .. warning::
       The distribution must be left intact as much as possible (do not tune,
       tweak, or configure it, or install any software).

Proxies
-------

For nodes operating behind a proxy, see :ref:`Bootstrap Configuration`.

Linux Kernel Version
--------------------

Linux kernels shipped with CentOS/RHEL 7 and earlier are affected by a
cgroups memory leak bug.

This bug was fixed in kernel 3.10.0-1062.4.1. Use this kernel version or later.

The version can be retrieved using:

  .. code-block:: shell

    $ uname -r

If the installed version is lower than the one above, upgrade it with:

  .. code-block:: shell

    $ yum upgrade -y kernel-3.10.0-1062.4.1.el7
    $ reboot

These commands may require sudo or root access.

Provisioning
------------

SSH
^^^

Each machine must be accessible through SSH from the host. :doc:`Bootstrap node
deployment<./bootstrap>` generates a new SSH identity for the :term:`Bootstrap
node` and shares it with other nodes in the cluster. You can also do this
manually beforehand.

Network
^^^^^^^

Each machine must be a member of both the control plane and workload plane
networks described in :ref:`installation-intro-networks`. However, these
networks can overlap, and nodes do not need distinct IP addresses for each
plane.

For the host to reach the cluster-provided UIs, it must be able to connect to
the machines' control plane IP addresses.

Repositories
^^^^^^^^^^^^

Each machine must have properly configured repositories with access to basic
repository packages (depending on the operating system).

CentOS:

    - base
    - extras
    - updates

RHEL 7:

    - rhel-7-server-rpms
    - rhel-7-server-extras-rpms
    - rhel-7-server-optional-rpms

RHEL 8:

    - rhel-8-for-x86_64-baseos-rpms
    - rhel-8-for-x86_64-appstream-rpms

    .. note::

       RHEL instances must be `registered <RHSM register_>`_.

.. note::

    Repository names and configurations do not need to be the same as the
    official ones, but all packages must be made available.

To enable an existing repository:

  CentOS:

    .. code-block:: shell

       yum-config-manager --enable <repo_name>

  RHEL:

    .. code-block:: shell

       subscription-manager repos --enable=<repo_name>

To add a new repository:

  .. code-block:: shell

     yum-config-manager --add-repo <repo_url>

  .. note::

     `repo_url` can be set to a remote URL using the prefix `http://`, `https://`,
     `ftp://`, etc., or to a local path using `file://`.

For more, review the official Red Hat documentation:

    - `Enable Optional repositories with RHSM`_
    - `Configure repositories with YUM`_
    - `Advanced repositories configuration`_

.. _Setup etcd partition:

etcd
^^^^

For production environments, a block device dedicated to :term:`etcd` is
recommended for better performance and stability. With lower write latency and
less variance than spinning disks, SSDs are recommended to improve reliability.

The device must be formatted and mounted on /var/lib/etcd, on Nodes intended to
bear the :ref:`etcd role<node-role-etcd>`.

For more on etcd's hardware requirements, see the
`official documentation <https://etcd.io/docs/v3.3.12/op-guide/hardware>`_.

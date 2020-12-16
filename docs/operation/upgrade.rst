Upgrade Guide
=============
Upgrading a MetalK8s cluster is handled via utility scripts which are packaged
with every new release.
This section describes a reliable upgrade procedure for **MetalK8s** including
all the components that are included in the stack.

Supported Versions
******************
.. note::

    MetalK8s supports upgrade of **at most** one minor version at a time.
    For example:

    - from 2.4.0 to 2.4.4
    - from 2.4.0 to 2.5.1

    Please refer to the
    `release notes <https://github.com/scality/metalk8s/releases>`_ for more
    information.

Upgrade Pre-requisites
**********************
Before proceeding with the upgrade procedure, make sure to complete the
pre-requisites listed in :doc:`/operation/preparation`.

Run pre-checks
--------------
You can test if your environment will successfully upgrade with the following
command.
This will simulate the upgrade pre-checks and provide an overview of the
changes to be carried out in your MetalK8s cluster.

.. important::

    The version prefix metalk8s-**X.Y.Z** as used below during a MetalK8s
    upgrade must be the new MetalK8s version you would like to upgrade
    to.

   .. code::

     /srv/scality/metalk8s-X.Y.Z/upgrade.sh --dry-run --verbose

Upgrade Steps
*************
Ensure that the upgrade pre-requisites above have been met before you make
any step further.

To upgrade a MetalK8s cluster, run the utility script shipped
with the **new** version you want to upgrade to:

.. important::

    The version prefix metalk8s-**X.Y.Z** as used below during a MetalK8s
    upgrade must be the new MetalK8s version you would like to upgrade
    to.

- From the :term:`Bootstrap node`, launch the upgrade.

   .. code::

     /srv/scality/metalk8s-X.Y.Z/upgrade.sh

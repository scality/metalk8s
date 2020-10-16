Upgrade Guide
=============
Upgrading a MetalK8s cluster is handled via utility scripts which are packaged
with every new release.
This section describes a reliable upgrade procedure for **MetalK8s** including
all the components that are included in the stack.

Supported Versions
******************
.. note::

    MetalK8 supports upgrade **strictly** from one supported
    minor version to another. For example:

    - Upgrade from 2.0.x to 2.0.x
    - Upgrade from 2.0.x to 2.1.x

    Please refer to the
    `release notes <https://github.com/scality/metalk8s/releases>`_ for more
    information.

Upgrade Pre-requisites
**********************
Before proceeding with the upgrade procedure, make sure to complete the
pre-requisites listed in :doc:`/operation/preparation`.

Run pre-check
-------------
You can test if your environment will successfully upgrade with the following
command.
This will simulate the upgrade prechecks and provide an overview of the
changes to be carried out in your MetalK8s cluster.

.. important::

    The version prefix metalk8s-**X.X.X** as used below during a MetalK8s
    upgrade must be the new MetalK8s version you would like to upgrade
    to.

   .. code::

     /srv/scality/metalk8s-X.X.X/upgrade.sh --dry-run --verbose

Backup old credentials
----------------------
Starting 2.5.0, MetalK8s will henceforth implement OpenID Connect (OIDC) based
authentication. Both K8s and Grafana will be configured to make use of the same
OIDC provider.

.. warning::

    Before running an upgrade from 2.4.x to 2.5.0 or higher, MetalK8s
    administrators **must** ensure all static users defined in
    ``/etc/kubernetes/htpasswd`` can be recreated, and if any, all users that
    were defined in Grafana.
    The upgrade procedure will result in all admin credentials being reset
    to their default values, and any additional user being removed. MetalK8s
    administrators need to remember and reconfigure these username/password
    pairs.

    After upgrade is complete, a procedure for configuring the OIDC provider
    (Dex) user store will be provided in the next version.

Upgrade Steps
*************
Ensure that the upgrade pre-requisites above have been met before you make
any step further.

To upgrade a MetalK8s cluster, run the utility script shipped
with the **new** version you want to upgrade to:

.. important::

    The version prefix metalk8s-**X.X.X** as used below during a MetalK8s
    upgrade must be the new MetalK8s version you would like to upgrade
    to.

- From the :term:`Bootstrap node`, launch the upgrade.

   .. code::

     /srv/scality/metalk8s-X.X.X/upgrade.sh

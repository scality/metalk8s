Upgrade
=======

Upgrading a MetalK8s cluster is handled via utility scripts which arepackaged
with your current installation.

Supported Upgrade Paths
***********************

.. note::

    MetalK8 supports upgrade **strictly** from one supported
    minor version to another. For example:

    - Upgrade from 2.0.x to 2.0.x
    - Upgrade from 2.0.x to 2.1.x

    Please refer to the
    `release notes <https://github.com/scality/metalk8s/releases>`_ for more
    information.

Prerequisites
*************

- Provision the new **Metalk8s** ISO by running the utility script shipped
  with the current installation:

   .. code::

     /srv/scality/metalk8s-X.X.X/iso-manager.sh -a <path_to_iso>

- Test if the upgrade procedure is compatible with your environment:

   .. code::

     /srv/scality/metalk8s-X.X.X/upgrade.sh --destination-version <destination_version> --dry-run --verbose

Procedure
*********

.. important::

    The version prefix metalk8s-**X.X.X** as used below during a MetalK8s
    upgrade must be the new MetalK8s version you would like to upgrade
    to.

Launch the upgrade from the :term:`Bootstrap node`.

   .. code::

     /srv/scality/metalk8s-X.X.X/upgrade.sh --destination-version <destination_version>

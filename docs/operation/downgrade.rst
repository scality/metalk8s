Downgrade
=========

Downgrading a MetalK8s cluster is handled via utility scripts which are
packaged with your current installation.

Supported Downgrade Paths
*************************

.. note::

    MetalK8 supports downgrade **strictly** from one supported
    minor version to another. For example:

    - Downgrade from 2.1.x to 2.0.x
    - Downgrade from 2.2.x to 2.1.x

    Please refer to the
    `release notes <https://github.com/scality/metalk8s/releases>`_ for more
    information.

Prerequisites
*************

- Provision the new **Metalk8s** ISO by running the utility script shipped
  with the current installation:

   .. code::

     /srv/scality/metalk8s-X.X.X/iso-manager.sh -a <path_to_iso>

- Test if the downgrade procedure is compatible with your environment:

   .. code::

     /srv/scality/metalk8s-X.X.X/downgrade.sh --destination-version <destination_version> --dry-run --verbose

Procedure
*********

.. important::

    The version prefix metalk8s-**X.X.X** as used below during a MetalK8s
    downgrade must be the currently-installed MetalKs8 version.

Launch the downgrade from the :term:`Bootstrap node`.

   .. code::

     /srv/scality/metalk8s-X.X.X/downgrade.sh --destination-version <version>


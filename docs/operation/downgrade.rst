MetalK8s Cluster Downgrade
==========================

The MetalK8s Cluster Downgrade is handled via utility scripts which are
packaged with your current installation.
This section describes how to downgrade MetalK8s with all the components
that are included in the stack.

Supported Versions
******************

.. note::

    MetalK8 supports downgrade of **at most** one minor version at a time.
    For example:

    - from 2.4.4 to 2.4.1,
    - from 2.5.1 to 2.4.0.

    Refer to the
    `release notes <https://github.com/scality/metalk8s/releases>`_ for more
    information.

.. only:: downgrade_not_supported

   .. warning::

      Version |release| only supports downgrade of patch version.

Prerequisites
*************

ISO Preparation
---------------

Provision a new **MetalK8s** ISO by running the utility script shipped
with the current installation.

.. code::

   /srv/scality/metalk8s-X.X.X/iso-manager.sh -a <path_to_iso>

Pre-checks
----------

You can test if your environment will successfully downgrade with the following
command.

.. code::

   /srv/scality/metalk8s-X.Y.Z/downgrade.sh --destination-version \
     <destination_version> --dry-run --verbose

This will simulate the downgrade pre-checks and provide an overview of the
changes to be carried out in your MetalK8s cluster.

.. important::

    The version prefix metalk8s-**X.Y.Z** must be the *current* installed
    MetalK8s version.

Downgrade
*********

#. Ensure that the prerequisites have been met.

#. Run the utility script shipped with the *current* installation
   providing it with the destination version.

#. From the :term:`Bootstrap node`, launch the downgrade.

   .. code::

      /srv/scality/metalk8s-X.Y.Z/downgrade.sh --destination-version <version>

.. important::

    The version prefix metalk8s-**X.Y.Z** must be the *current* installed
    MetalK8s version.

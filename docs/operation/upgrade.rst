MetalK8s Cluster Upgrade
========================

The MetalK8s Cluster Upgrade is handled via utility scripts which are packaged
with every new release.
This section describes how to upgrade MetalK8s with all the components
that are included in the stack.

Supported Versions
******************

.. note::

    MetalK8s supports upgrade of **at most** one minor version at a time.
    For example:

    - from 2.4.0 to 2.4.4,
    - from 2.4.0 to 2.5.1.

    Refer to the
    `release notes <https://github.com/scality/metalk8s/releases>`_ for more
    information.

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

You can test if your environment will successfully upgrade with the following
command:

.. code::

   /srv/scality/metalk8s-X.Y.Z/upgrade.sh --dry-run --verbose

This will simulate the upgrade pre-checks and provide an overview of
the changes to be carried out in your MetalK8s cluster.

.. important::

    The version prefix metalk8s-**X.Y.Z** must be the *new* MetalK8s version
    you want to upgrade to.


Upgrade
*******

#. Ensure that the prerequisites have been met.

#. Run the utility script shipped with the *new* version you want to
   upgrade to.

#. From the :term:`Bootstrap node`, launch the upgrade.

   .. code::

      /srv/scality/metalk8s-X.Y.Z/upgrade.sh

   .. important::

      The version prefix metalk8s-**X.Y.Z** must be the *new* MetalK8s version
      you want to upgrade to.

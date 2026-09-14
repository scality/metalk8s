Cluster Upgrade
===============

MetalK8s clusters are upgraded using the utility scripts packaged with
every new release.
This topic describes upgrading MetalK8s and all components included
in the stack.

Supported Versions
******************

.. note::

    MetalK8s supports upgrade of *at most* one major version at a time.
    For example:

    - from 123.1.2 to 124.2.0,
    - from 123.0.1 to 124.0.0.

    Refer to the
    `release notes <https://github.com/scality/metalk8s/releases>`_ for more
    information.

Prerequisites
*************

ISO Preparation
---------------

Provision a new MetalK8s ISO by running the utility script shipped
with the current installation.

.. parsed-literal::

   /srv/scality/metalk8s-X.X.X/iso-manager.sh -a <path_to_iso>

Pre-Checks
----------

Use the ``--dry-run`` option to validate your environment for upgrade:

.. code::

   /srv/scality/metalk8s-X.Y.Z/upgrade.sh --dry-run --verbose

This will simulate the upgrade pre-checks and provide an overview of
the changes to be carried out in your MetalK8s cluster.

.. important::

    The version prefix metalk8s-**X.Y.Z** must be the *new* MetalK8s version
    you want to upgrade to.

Upgrade
*******

#. Run the utility script shipped with the *new* version you want to
   upgrade to.

#. From the :term:`Bootstrap node`, launch the upgrade.

   .. code::

      /srv/scality/metalk8s-X.Y.Z/upgrade.sh

   .. important::

      The version prefix metalk8s-**X.Y.Z** must be the *new* MetalK8s version
      you want to upgrade to.

Resuming an Interrupted Upgrade
*******************************

Nodes are upgraded one at a time, and each one carries the
``metalk8s.scality.com/version-in-progress`` annotation for as long as its
deployment runs. A node that fails mid-upgrade keeps that annotation, and
the last version it completed stays recorded in
``metalk8s.scality.com/version-applied``. Both are maintained by the node
deployment itself, so they also follow a node added through
:doc:`/installation/expansion`.

To resume, run ``upgrade.sh`` again with the same version. Only the nodes
that need it are deployed again: those still carrying the in-progress
annotation, and those that never recorded the destination version. A node
whose ``metalk8s.scality.com/version-applied`` already reads the destination
is left alone. For as long as a node carries the in-progress annotation, the
upgrade prechecks refuse any other destination, since moving that node to
another version would mean downgrading it.

.. important::

   Do not point ``upgrade.sh`` at a version older than the one the cluster
   runs. A node that completed a newer version is skipped, not moved back.
   Use ``downgrade.sh`` to go back to an older version, as described in
   :doc:`/operation/downgrade`.

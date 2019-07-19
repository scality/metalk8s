Upgrade Guide
=============
This section describes a reliable upgrade path for **MetalK8s** including
all the components that make up the stack.

Supported Versions
******************
.. note::

    MetalK8 supports upgrade **strictly** from one supported
    minor version to another. For example:

    - Upgrade from 2.0.x to 2.0.x
    - Upgrade from 2.0.x to 2.1.x

    Please refer to the release notes for more information.

Upgrade Pre-requisites
**********************
Prior to beginning the upgrade steps listed below, make sure to complete the
pre-requisites listed in :doc:`/operation/preparation`.

Upgrade Steps
*************
Ensure that the pre-requisites above have been met before you make
any step further.


- From the :term:`Bootstrap node`, launch the upgrade.

   .. code::

     /srv/scality/metalk8s-X.X.X/upgrade.sh --destination-version <destination_version>

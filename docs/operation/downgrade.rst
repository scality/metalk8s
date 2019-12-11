Downgrade Guide
***************
Downgrading a MetalK8s cluster is handled via utility scripts which are
packaged with your current installation.
This section describes a reliable downgrade procedure for **MetalK8s**
including all the components that are included in the stack.

Supported Versions
******************
.. note::

    MetalK8 supports downgrade **strictly** from one supported
    minor version to another. For example:

    - Downgrade from 2.1.x to 2.0.x
    - Downgrade from 2.2.x to 2.1.x

    Please refer to the
    `release notes <https://github.com/scality/metalk8s/releases>`_ for more
    information.

Downgrade Pre-requisites
************************
Before proceeding with the downgrade procedure, make sure, make sure to
complete the pre-requisites listed in :doc:`/operation/preparation`.

You can test if your environment will successfully downgrade with the following
command.
This will simulate the downgrade procedure and provide an overview of the
changes to be carried out in your MetalK8s cluster.

   .. code::

     /srv/scality/metalk8s-X.X.X/downgrade.sh --destination-version <destination_version> --dry-run --verbose

Downgrade Steps
***************
Ensure that the downgrade pre-requisites above have been met before you make
any step further.

To downgrade a MetalK8s cluster, run the utility script shipped
with the **current** installation providing it with the destination version:

.. important::

    The version prefix metalk8s-**X.X.X** as used below during a MetalK8s
    downgrade must be the currently-installed MetalKs8 version.

- From the :term:`Bootstrap node`, launch the downgrade.

   .. code::

     /srv/scality/metalk8s-X.X.X/downgrade.sh --destination-version <version>


Downgrade Guide
***************
Downgrading a MetalK8s cluster is handled via utility scripts which are
packaged with your current installation.
This section describes a reliable downgrade procedure for **MetalK8s**
including all the components that are included in the stack.

.. warning::

   Downgrading a single-node cluster from 2.7.x to 2.6.y with
   ``SparseLoopDevice`` volumes will force draining of this single node.
   Expect an interruption of service during this downgrade (production
   deployments **should not** rely on ``SparseLoopDevice`` volumes).

Supported Versions
******************

.. note::

    MetalK8 supports downgrade of **at most** one minor version at a time.
    For example:

    - from 2.4.4 to 2.4.1
    - from 2.5.1 to 2.4.0

    Please refer to the
    `release notes <https://github.com/scality/metalk8s/releases>`_ for more
    information.

.. only:: downgrade_not_supported

   .. warning::

      Version |release| only supports downgrade of patch version.

Downgrade Pre-requisites
************************
Before proceeding with the downgrade procedure, make sure to complete the
pre-requisites listed in :doc:`/operation/preparation`.

Run pre-checks
--------------
You can test if your environment will successfully downgrade with the following
command.
This will simulate the downgrade pre-checks and provide an overview of the
changes to be carried out in your MetalK8s cluster.

.. important::

    The version prefix metalk8s-**X.Y.Z** as used below during a MetalK8s
    downgrade must be the currently installed MetalK8s version.

   .. code::

     /srv/scality/metalk8s-X.Y.Z/downgrade.sh --destination-version \
       <destination_version> --dry-run --verbose

Downgrade Steps
***************
Ensure that the downgrade pre-requisites above have been met before you make
any step further.

MetalK8s downgrade
------------------

To downgrade a MetalK8s cluster, run the utility script shipped
with the **current** installation providing it with the destination version:

.. important::

    The version prefix metalk8s-**X.Y.Z** as used below during a MetalK8s
    downgrade must be the currently installed MetalK8s version.

- From the :term:`Bootstrap node`, launch the downgrade.

   .. code::

     /srv/scality/metalk8s-X.Y.Z/downgrade.sh --destination-version <version>


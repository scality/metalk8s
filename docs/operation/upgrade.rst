Upgrade Guide
=============
This section describes a reliable upgrade path for **MetalK8s** including
all the components that make up the stack.

.. important::

    - Upgrading MetalK8s is a manual process and as a result,
      the following outlined steps must be met to the later in order to achieve
      a successful upgrade.
    - The output of the below-provided commands solely depends on the particular
      MetalK8s setup you have in place.
    - **<destination_version>**
      is a suffix which must be replaced with appropriate version number.

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

#. Upgrade the :term:`Bootstrap node`.

    .. warning::
        This command must be executed only on the
        :term:`Bootstrap node`. Before proceeding, make sure that
        this is verified.

    .. code::

       salt-call --local state.sls metalk8s.roles.bootstrap saltenv=metalk8s-<destination_version> pillar="{'metalk8s': {'endpoints': $(salt-call --out txt pillar.get metalk8s:endpoints | cut -c 8-)}}"

#. From the :term:`Bootstrap node`, connect to the :term:`Salt Master`.

    ::

        crictl exec -it $(crictl ps -q --label io.kubernetes.container.name=salt-master) bash

#. Check what will be done during upgrade.
   Replace **<destination_version>** with the appropriate version number.

    .. warning::
        This command must be executed only on the
        :term:`Salt Master`. Before proceeding, make sure that
        this is verified.

    ::

        salt-run state.orchestrate metalk8s.orchestrate.upgrade.precheck saltenv=metalk8s-<destination_version> pillar="{'orchestrate': {'dest_version': '<destination_version>'}}"

#. From the :term:`Salt Master`, launch the rolling upgrade.

    .. warning::
        This command must be executed only on the
        :term:`Salt Master`. Before proceeding, make sure that
        this is verified.

    ::

        salt-run state.orchestrate metalk8s.orchestrate.upgrade saltenv=metalk8s-<destination_version> pillar="{'orchestrate': {'dest_version': '<destination_version>'}}"

    .. note::
        - By default, the orchestrate mechanism will upgrade pods and cluster
          components on a one by one basis.
        - Upgrades can potentially take time so make sure to wait
          until it is completed.

#. Verify that the upgrade was successful.

   On the :term:`Bootstrap node`, check to confirm that a new version of
   **MetalK8s** has been installed.

   .. code-block:: shell

        salt-call slsutil.renderer string="{{ pillar.metalk8s.nodes[grains.id].version }}"

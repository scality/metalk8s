ISO Preparation
===============
This section describes a reliable way for provisioning a new **MetalK8s** ISO
for upgrade or downgrade.

.. important::

    - **<destination_version>**
      is a suffix which must be replaced with appropriate version number.

Make new ISO available
~~~~~~~~~~~~~~~~~~~~~~

#. Upload the MetalK8s `.ISO` file to the :term:`Bootstrap node`.

#. Connect to the :term:`Bootstrap node`.

#. Edit the :file:`bootstrap.yaml` file located in
   :file:`/etc/metalk8s/bootstrap.yaml` then add the new MetalK8s ISO path.

   .. code::

      products:
        metalk8s:
        - /home/scality/metalk8s-2.0.0.iso
        - <path_to_the_new_iso>                        <=== New line to add

#. Mount the ISO file.

   .. code::

      salt-call state.sls metalk8s.products.mounted saltenv=metalk8s-$(salt-call --out txt slsutil.renderer string="{{ pillar.metalk8s.nodes[grains.id].version }}" | cut -c 8-)

#. Configure the new repositories and salt-master.
   Replace **<destination_version>** with the appropriate version number.

   .. code::

      salt-call --local state.sls metalk8s.products.configured saltenv=metalk8s-<destination_version> pillar="{'metalk8s': {'endpoints': $(salt-call --out txt pillar.get metalk8s:endpoints | cut -c 8-)}}"

#. Make the new version available.

   .. code::

      salt-call state.sls metalk8s.products saltenv=metalk8s-$(salt-call --out txt slsutil.renderer string="{{ pillar.metalk8s.nodes[grains.id].version }}" | cut -c 8-)

Workload Storage
================

Some workloads need different volumes with different storage capacities
to fit its components needs. These volumes are stored in :term:`LVM Logical
Volumes <LVM LV>`.


Volumes
-------

Based on all required storage volumes, create a configuration as below:

.. code-block:: yaml

    metalk8s_lvm_drives_vg_metalk8s: ['/dev/vdb']
    metalk8s_lvm_lvs_vg_metalk8s:
        lv01:
            size: 52G
        lv02:
            size: 52G
        lv03:
            size: 52G
        lv04:
            size: 11G
        lv05:
            size: 11G
        lv06:
            size: 11G
        lv07:
            size: 5G
        lv08:
            size: 5G

Resize LVs
----------

Volumes can be resized (one or several at once). Change the volume
size value to a higher one and run:

.. code::

  ansible-playbook -i <inventory>/hosts -t storage playbooks/deploy.yml

Configuration layout
--------------------

The configuration can be applied to groups and hosts in two
different ways.

.. note::
   Configuration files are merged for every created host or group.

To apply a configuration, create a YAML file in either (or both)
:file:`group_vars` and :file:`host_vars` with the group name
associated, or create a folder in :file:`group_vars` or
:file:`host_vars` with several YAML files.
The :command:`ansible-playbook` above must be run.

Add extra LVs
-------------

It is possible to configure LVM drives and volumes for one node only.

Exemplified below, a default storage configuration:

:file:`group_vars/kube-node/storage.yml`

.. code::

  # metalk8s_lvm_vgs = ['vg_metalk8s']
  metalk8s_lvm_drives_vg_metalk8s: ['/dev/vdb']
  metalk8s_lvm_lvs_vg_metalk8s:
    lv01:
        size: 52G
    lv02:
        size: 52G
    lv03:
        size: 52G

In :file:host_vars, create a new file with:

:file:`host_vars/node_1.yml`

.. code::

   metalk8s_lvm_vgs = ['vg_metalk8s', 'mynewvg']
   metalk8s_lvm_drives_mynewvg: ['/dev/vdc']
   metalk8s_lvm_lvs_vg_metalk8s:
     lv01:
        size: 52G
   metalk8s_lvm_lvs_mynewvg:
     lv01:
        size: 1T

Except ``node_1``, every machine has a single `vg_metalk8s` with six logical
volumes (:term:`LVM LV`) (three specified, three default).
On node_1, there are two volume groups (:term:`LVM VG`) (`vg_metalk8s` and
`mynewvg`) with four logical volumes (:term:`LVM LV`) on `vg_metalk8s` (one
specified, three default) and one logical volume (:term:`LVM LV`) on `mynewvg`.

.. note::
   As the volume group name becomes a prefix, several LVs can have the same name.

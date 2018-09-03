Upgrading from MetalK8s < 0.2.0
===============================

MetalK8s 0.2.0 introduced changes to persistent storage provisioning that are
not backwards-compatible with MetalK8s 0.1. These changes include:

- The default LVM VG was renamed from `kubevg` to `vg_metalk8s`.
- Only the PersistentVolumes required by MetalK8s services are created by
  default.
- Instead of using dictionaries to configure the storage, these are now
  flattened.

When a MetalK8s 0.1 configuration is detected, the playbook reports an error.

If you have an early configuration like:

  .. code-block:: yaml

    metal_k8s_lvm:
      vgs:
        kubevg:
          drives: ['/dev/vdb']

set the following values in :file:`kube-node.yml` to maintain pre-0.2
behavior:

- Disable deployment of 'default' volumes:

  .. code-block:: yaml

      metalk8s_lvm_default_vg: False

- Register the `kubevg` VG to be managed:

  .. code-block:: yaml

      metalk8s_lvm_vgs: ['kubevg']

- Use :file:`/dev/vdb` as a volume for the `kubevg` VG:

  .. code-block:: yaml

      metalk8s_lvm_drives_kubevg: ['/dev/vdb']

  Note how the VG name is appended to the `metalk8s_lvm_drives_` prefix to
  configure a VG-specific setting.

- Create and register the default MetalK8s 0.1 LVs and PersistentVolumes:

  .. code-block:: yaml

      metalk8s_lvm_lvs_kubevg:
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

When you have made all needed changes, step into the Quickstart at “Enter the
MetalK8s Virtual Environment Shell.”

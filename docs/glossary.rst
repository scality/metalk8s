:tocdepth: 1

Glossary
========
.. glossary::

  LVM Physical Volume : LVM
  LVM PV : LVM
    A volume (disk or partition) consumed by a :term:`Volume Group<LVM VG>` to
    provide storage to :term:`Logical Volumes<LVM LV>`.

  LVM Volume Group : LVM
  LVM VG : LVM
    A logical unit that aggregates :term:`Physical Volumes<LVM PV>` to
    provision :term:`Logical Volumes<LVM LV>`

  LVM Logical Volume : LVM
  LVM LV : LVM
    A volume, part of a :term:`Volume Group<LVM LV>`, that exposes a slice of
    its backing storage.

  Kubernetes PersistentVolume : Kubernetes
  Kubernetes PV : Kubernetes
    An existing persistent storage volume available to Kubernetes workloads.

  Kubernetes PersistentVolumeClaim : Kubernetes
  Kubernetes PVC : Kubernetes
    A claim on a :term:`PersistentVolume<Kubernetes PersistentVolume>` consumed
    by one or more *Pods*.

Common Environment Variables
----------------------------
.. envvar:: ANSIBLE_LOG_PATH

   File to which Ansible will write logs on the controller when empty logging is
   disabled. See :ref:`ansible:DEFAULT_LOG_PATH` for more information.

.. envvar:: KUBECONFIG

   Path to a file used to configure access to a Kubernetes cluster when using
   :command:`kubectl` or other tools.

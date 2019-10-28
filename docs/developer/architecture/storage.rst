Persistent Storage Management Architecture Document
===================================================

Context:
--------

Persistent Storage in K8S is provided through Persistent Volumes (PV) that
any container can claim and bind. In cloud infrastructure, those PVs are
available on demand and automatically provisioned by the cloud provider.
In the context of MetalK8s, those PVs have to be created directly from the
HW / OS infrastructure. The goal of this feature is to make PV provisioning
as easy as possible (whatever is the storage infrastructure behind) and
available from MetalK8s APIs and UIs, without having to use low level OS / RAID
utilities.

We may find different storage architecture on a server:
   - different type of disks (HDD, SDD or NVMe)
   - behind some RAID controller or not

Some containers running in the MetalK8s cluster may require an entire disk
but in some other cases we may want to slice a disk in several parts so
that it can be shared by several containers.

Currently MetalK8s PV provisioning supports either sparse loop device, either
block device, but there is no way to provision a PV directly from disks
behind a RAID card or from part of a disk (i.e. using LVM). We don't have the
need for now to expose a LVM PV that would be the result of aggregating
multiple disks together.

Requirements:
-------------

We want to expose 2 main functionalities:
   - **LVM LV Volume**: ability to provision PVs that will use a slice of one
   disk, whether it is behind a RAID card or not. This is what will be needed
   in order to provision PVs out of one SSD in the context of Zenko for
   example.
   Our storage operator will the new MetalK8s Volume CR and do the necessary to
   create the LVM LV, format and and make it a PV resource available in the
   K8S cluster.
   - **RAID DAS Volume**: ability to provision PVs that will use an entire disk
   using the right RAID card configuration. The storage operator should
   retrieve all needed info (disk index, allocated RAM, etc ...) from the
   Volume CR, use it to configure the RAID card and expose the disk as a raw
   block device.

We likely want to have a new CRD in our model that would be a Volume Group.
This Volume Group would represent an abstraction of a LVM VG that could be
created from a disk behind a RAID card, an existing block device or
even a sparse loop device for test purposes.

.. image:: img/storage-overview.png

LVM User Stories:
-------------
**MetalK8s LVM LV Volume provisioning**

pre req: the LVM VG (or MetalK8s Volume Group) has been created

As a IT Specialist, I want to provision a K8S PV (through UI or API) which is a
slice of an existing Block Device, in order to provision persistent storage
for one container.

This action is done through the POST of one Volume object in which we specify
the name of a LVM VG, the size of the slice, as well as usual parameters we
need for any Volume (storage class, labels, etc ...). This Volume is of type
LVM LV

The UI does not allow the user to request a slice that is bigger than
available space on LVM VG (or operator reports an error ...)

The storage operator reconciles the Volume Object to create corresponding LVM
LV, format it and create the K8S PV out of it.


**MetalK8s LVM VG Volume provisioning from Block Device**

As a IT Specialist, I want to provision a Volume Group (through UI or API)
which is a representation of an LVM VG to create, in order to create LVM LV
Volumes out of it.

This action is done through the POST of one Volume Group object in which we
specify the name of the LVM VG to create, the name of the PV (i.e Block Device)
out of which we want to create the LVM VG.

In the UI, we have a new page from which we can perform this operation. the
page should be quite similar to Volume provisioning page. When listing
available Volume Groups, we should be able to see the size of the VG and the
name of the PV on which it has been created.

The storage operator reconciles the Volume Group Object to:
   - create a PV from the block device name
   - create a VG out of it

**MetalK8s LVM VG Volume provisioning from Sparse Loop Device**

As a Developer, I want to provision a Volume Group (through UI or API)
backed by a sparse loop device, in order to have an easy way to test all
LVM features.

Same as previous user Story but in this case, the storage operator will first
create a sparse loop device (size has to be specified in Volume Group CR) and
then create the PV and the VG.

**MetalK8s LVM VG management in the UI**

If provisioning of MetalK8s LVM LV or LVM VG failed, it should clearly appear
as a specific status in the UI. The reason why it failed is displayed within a
notification. We should be able to delete such a Volume or Volume Group from
the UI.
As for other Volumes,
   - I can't delete a Volume for which the corresponding PV is bound to a
   container.
   - I can't delete a Volume Group if one belonging Volume and associated PV is
   bound.
   - Deleting a MetalK8s LVM LV Volume deletes the associated LVM LV config.
   - Deleting a MetalK8s Volume Group deletes all belonging Volumes and clean
   all LVM config (to be discussed / confirmed)

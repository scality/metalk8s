Storage Architecture
====================

MetalK8s current strage architecture rely on local storage, configured with LVM
for its purpose.

A default setup, satisfying the storage needs of MetalK8s is automatically
setup by default and can be easily extended through the various configuration
items exposed by the tool.

Glossary
########

* LVM PV: The LVM Physical Volume. This is the disk or the partition provided
  to LVM to create the LVM Volume Group
* LVM VG : The LVM Volume Group. This is the logical unit of LVM aggregating
  the LVM Physical Volumes into one single logical entity
* LVM LV: A Logical Volume. This is where the filesystem will be created.
  Several LVM LVs can be created on a single LVM VG
* PV : Kubernetes Persistent Volume. This is what will be consumed by a
  Persistent Volume Claim for the Kubernetes storage needs
* PVC : Kubernetes Persisten Volume Claim


Goal
####

MetalK8s provides a functional Kubernetes cluster with some opinionated
deployment for the monitoring and logging aspect.
These deployments require storage, but we wanted to provide an easy way for
the end user to add it's own configuration

As the deployment of Kubernetes on premise is focused on dedicated hardware,
Logical Volume Manager (LVM) has been chosen.

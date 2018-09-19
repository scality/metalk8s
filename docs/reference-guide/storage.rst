.. _storage-architecture:

Storage Architecture
====================
Storage provisioned by MetalK8s is currently backed by :term:`LVM Logical
Volumes<LVM LV>`. A default setup will provision volumes tailored to
the needs of various services deployed with MetalK8s, but this list can be
extended to provide volumes which fulfil the needs of your application
workloads.

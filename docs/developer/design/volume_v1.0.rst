Volume Management v1.0
======================

* MetalK8s-Version: 2.4
* Replaces:
* Superseded-By:


Absract
-------

To be able to run stateful services (such as Prometheus, Zenko or Hyperdrive),
MetalK8s needs the ability to provide and manage persistent storage resources.

To do so we introduce the concept of MetalK8s **Volume**, using a **Custom
Resource Definition** (CRD), built on top of the existing concept of
**Persistent Volume** from Kubernetes. Those **Custom Resources** (CR) will be
managed by a dedicated Kubernetes operator which will be responsible for the
storage preparation (using Salt states) and lifetime management of the backing
**Persistent Volume**.

Volume management will be available from the Platform UI (through a dedicated
tab under the Node page). There, users will be able to create, monitor and
delete MetalK8s volumes.


Scope
-----

The scope of this first version of Volume Management will be minimalist but
still functionally useful.


Goals
^^^^^

* support two kinds of **Volume**:

  * **sparseLoopDevice** (backed by a sparse file)
  * **rawBlockDevice** (using whole disk)

* add support for volume creation (one by one) in the Platform UI
* add support for volume deletion (one by one) in the Platform UI
* add support for volume listing/monitoring (show status, size, …) in the
  Platform UI
* document how to create a volume
* document how to create a **StorageClass** object
* automated tests on volume workflow (creation, deletion, …)


Non-Goals
^^^^^^^^^

* RAID support
* LVM support
* expose raw block device (unformated) as **Volume**
* use an **Admission Controller** for semantic validation
* auto-discovery of the disks
* batch provisioning from the Platform UI


Proposal
--------

To implement this feature we need to:

* define and deploy a new CRD describing a MetalK8s **Volume**
* develop and deploy a new Kubernetes operator to manage the MetalK8s volumes
* develop new Salt states to prepare and cleanup underlying storage on the
  nodes
* update the Platform UI to allow volume management


User Stories
^^^^^^^^^^^^


Volume Creation
~~~~~~~~~~~~~~~

As a user I need to be able to create MetalK8s volume from the Platform UI.

At creation time I can specify the type of volume I want, and then either its
size (for **sparseLoopDevice**) or the backing device (for **rawBlockDevice**).

I should be able monitor the progress of the volume creation from the Platform
UI and see when the volume is ready to use (or if an error occured).


Volume Monitoring
~~~~~~~~~~~~~~~~~

As a user I should be able to see all the volumes existing on a specified node
as well as their states.


Volume Deletion
~~~~~~~~~~~~~~~

As a user I need to be able to delete a MetalK8s volume from the Platform UI
when I no longer need it.

The Platform UI should prevent me from deleting Volumes in use.

I should be able monitor the progress of the volume deletion from the Platform
UI.


Component Interactions
^^^^^^^^^^^^^^^^^^^^^^

User will create Metalk8s volumes through the Platform UI.

The Platform UI will create and delete **Volume** CRs from the API server.

The operator will watch events related to **Volume** CRs and
**PersistentVolume** CRs owned by a **Volume** and react in order to update the
state of the cluster to meet the desired state (prepare storage when a new
**Volume** CR is created, clean up resources when a **Volume** CR is deleted).
It will also be responsible for updating the states of the volumes.

To do its job, the operator will rely on Salt states that will be called
asynchronously (to avoid blocking the reconciliation loop and keep a reactive
system) through the Salt API. Authentication to the Salt API will be done
though a dedicated Salt account (with limited privileges) using credentials
from a dedicated cluster **Service Account**.

.. uml:: volume_v1.0-creation_seqdiag.uml

.. uml:: volume_v1.0-deletion_seqdiag.uml


Implementation Details
----------------------


Volume Status
^^^^^^^^^^^^^

A **PersistentVolume** from Kubernetes has the following states:

* **Pending**: used for **PersistentVolume** that is not available
* **Available**: a free resource that is not yet bound to a claim
* **Bound**: the volume is bound to a claim
* **Released**: the claim has been deleted, but the resource is not yet
  reclaimed by the cluster
* **Failed**: the volume has failed its automatic reclamation

Similarly, our **Volume** object will have the following states:

* **Available**: the backing storage is ready and the associated
  **PersistentVolume** was created
* **Pending**: preparation of the backing storage in progress (e.g.
  an asynchronous Salt call is still running).
* **Failed**: something is wrong with the volume (Salt state execution failed,
  invalid value in the CRD, …)
* **Terminating**: cleanup of the backing storage in progress (e.g.
  an asynchronous Salt call is still running).


Operator Reconciliation Loop
^^^^^^^^^^^^^^^^^^^^^^^^^^^^


Reconciliation Loop (Top Level)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

When the operator receives a request, the first thing it does is to fetch the
targeted **Volume**.
If it doesn't exist, which happens when a volume is **Terminating** and has no
finalizer, then there nothing more to do.

If the volume does exist, the operator has to check its semantic validity.

Once pre-checks are done, there are four cases:

1. the volume is marked for deletion: the operator will try to delete the
   volume (more details in :ref:`volume-finalization`).
2. the volume is stuck in an unrecoverable (automatically at least) error
   state: the operator can't do anything here, the request is considered done
   and won't be rescheduled.
3. the volume doesn't have a backing **PersistentVolume** (e.g. newly created
   volume): the operator will deploy the volume
   (more details in :ref:`volume-deployment`).
4. the backing **PersistentVolume** exists: the operator will check its status
   to update the volume's status accordingly.

.. uml:: volume_v1.0-main_loop_flowchart.uml


.. _volume-deployment:

Volume Deployment
~~~~~~~~~~~~~~~~~

To deploy a volume, the operator needs to prepare its storage (using Salt) and
create a backing **PersistentVolume**.

If the **Volume** object has no value in its ``Job`` field, it means that the
deployment hasn't started, thus the operator will set a finalizer on the
**Volume** object and then start the preparation of the storage using an
asynchronous Salt call (which gives a job ID) before rescheduling the request
to monitor the evolution of the job.

If the **Volume** object has a job ID, then the storage preparation is in
progress and the operator will monitor it until it's over.
If the Salt job ends with an error, the operator will move the volume into a
failed state.

Otherwise (i.e. Salt job succeeded), the operator will proceed with the
**PersistentVolume creation** (which requires an extra Salt call, synchronous
this time, to get the volume size), taking care of putting a finalizer on the
**PersistentVolume** (so that its lifetime is tied to the **Volume**'s) and
set the **Volume** as the owner of the created **PersistentVolume**.

Once the **PersistentVolume** is successfuly created, the operator will move
the **Volume** to the `Available` state and reschedule the request (the next
iteration will check the health of the **PersistentVolume** just created).

.. uml:: volume_v1.0-deploy_volume_flowchart.uml


.. _volume-finalization:

Volume Finalization
~~~~~~~~~~~~~~~~~~~

A **Volume** in state **Pending** cannot be deleted (because the operator
doesn't know where it is in the creation process). In such cases, the
operator will we reschedule the request until the volume becomes either
**Failed** or **Available**.

For volumes with no backing **PersistentVolume**, the operator will directly
reclaim the storage on the node (using an asynchronous Salt job) and upon
completion it will remove the **Volume** finalizer to let Kubernetes delete the
object.

If there is a backing **PersistentVolume**, the operator will delete it (if
it's not already in a terminating state) and watch for the moment when it
becomes unused (this is done by rescheduling). Once the backing
**PersistentVolume** becomes unused, the operator will reclaim its storage and
remove the finalizers to let the object be deleted.

.. uml:: volume_v1.0-finalize_volume_flowchart.uml


Volume Deletion Criteria
^^^^^^^^^^^^^^^^^^^^^^^^

A volume should be deletable from the UI when it's deletable from a user point
of view (you can always delete an object from the API), i.e. when deleting the
object will trigger an "immediate" deletion (i.e. the object won't be
retained).

Here are the few rules that are followed to decide if a **Volume** can be
deleted or not:

- **Pending** states are left untouched: we wait for the completion of the
  pending action before deciding which action to take.
- The lack of status information is a transient state (can happen between the
  **Volume** creation and the first iteration of the reconciliation loop) and
  thus we make no decision while the status is unset.
- **Volume** objects whose **PersistentVolume** is bound cannot be deleted.
- **Volume** objects in **Terminating** state cannot be deleted because their
  deletion is already in progress!

In the end, a **Volume** can be deleted in two cases:

- it has no backing **PersistentVolume**
- the backing **PersistentVolume** is not bound (**Available**, **Released** or
  **Failed**)

.. uml:: volume_v1.0-deletion_decision_tree.uml


Documentation
-------------

In the Operational Guide:

* document how to create a volume from the CLI
* document how to delete a volume from the CLI
* document how to create a volume from the UI
* document how to delete a volume from the UI
* document how to create a **StorageClass** from the CLI (and mention that we
  should set **VolumeBindingMode** to **WaitForFirstConsumer**)

In the Developper Documentation:

* document how to run the operator locally
* document this design


Test Plan
---------

We should have automated end-to-end tests of the feature (creation and
deletion), from the CLI and maybe on the UI part as well.

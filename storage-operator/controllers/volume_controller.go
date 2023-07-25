/*
Copyright 2021.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controllers

import (
	"context"
	"fmt"
	"io/ioutil"
	"strconv"
	"time"

	errorsng "github.com/pkg/errors"
	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	storagev1alpha1 "github.com/scality/metalk8s/storage-operator/api/v1alpha1"
	"github.com/scality/metalk8s/storage-operator/salt"
)

/* Explanations/schemas about volume lifecycle/reconciliation workflow {{{

===================================
= Reconciliation loop (top level) =
===================================

When receiving a request, the first thing we do is to fetch the targeted Volume.
If it doesn't exist, which happens when a volume is `Terminating` and has no
finalizer, then we're done: nothing more to do.

If the volume does exist, we have to check its semantic validity (this task is
usually done by an Admission Controller but it may not be always up and running,
so we should have a check here).

Once pre-checks are done, we will fall in one of four cases:
- the volume is marked for deletion: we have to try to delete the volume
  (details are given in the "Finalize Volume" section below).
- the volume is stuck in an unrecoverable (automatically at least) error state:
  we can't do anything here: the request is considered done and won't be
  rescheduled.
- the volume doesn't have a backing PersistentVolume (e.g: newly created
  volume): we have to "deploy" the volume (details are given in the "Deploy
  Volume" section below)
- the backing PersistentVolume exists: let's check its status to update the
  volume's status accordingly.

 -----                                                                   ------
(START)                                     +-------------------------->( STOP )
 -----                                      |                            ------
   |                                        |                              ^
   |                                        |                              |
   |                                        |                              |
   |                                  +------------+                       |
   |  +------------------------------>|DoNotRequeue|<-------------+        |
   |  |                               +------------+              |        |
   |  |N                                    ^                     |        |
   v  |                                     |Y                    |Y       |
+-------+ Y +------+ Y +-----------+ N  +-------+ N +-----+ Y +---------+  |
|Exists?|-->|Valid?|-->|Terminating?|-->|Failed?|-->|HasPv|-->|PvHealthy|  |
+-------+   +------+   +-----------+    +-------+   +-----+   +---------+  |
                |N           |Y                        |N        |N        |
                |            v                         v         |         |
                |      +--------------+          +------------+  |         |
                |      |FinalizeVolume|          |DeployVolume|  |         |
                |      +--------------+          +------------+  |         |
                |                                                v         |
                |                                         +---------+  +-------+
                +---------------------------------------->|SetFailed|->|Requeue|
                                                          +---------+  +-------+



=================
= Deploy Volume =
=================

To "deploy" a volume, we need to prepare its storage (using Salt) and create a
backing PersistentVolume.

If we have no value for `Job`, that means nothing has started, thus we set a
finalizer on ourself and then start the volume preparation using an asynchronous
Salt call (which gives us a job ID) before rescheduling the request to monitor
the evolution of the job.

If we do have a job ID, then something is in progress and we monitor it until
it's over.
If it has ended with an error, we move the volume into a failed state.

Otherwise we make another asynchronous Salt call to get information on the
backing storage device (the polling is done exactly as described above).

If we successfully retrieve the device information, we proceed with the
PersistentVolume creation, taking care of putting a finalizer on the
PersistentVolume (so that its lifetime is tied to ours) and setting ourself as
the owner of the PersistentVolume.

Once we have successfuly created the PersistentVolume, we can move into the
`Available` state and reschedule the request (the next iteration will check the
health of the PersistentVolume we just created).

                +------------------+   +------------------+   +----------+
            +-->|SetVolumeFinalizer|-->|SpawnPrepareVolume|-->|SetPending|
            |   +------------------+   +------------------+   +----------+
            | NO                                                 |
            |                                                    v
 -----    +----+ DONE  +--------+   +------------+          +-------+    ------
(START)-->|Job?|------>|CreatePV|-->|SetAvailable|--------->|Requeue|-->( STOP )
 -----    +----+       +--------+   +------------+          +-------+    ------
            | YES                                                ^
            v                                                    |
       +-----------+ Job Failed    +---------+                   |
       |           |-------------->|SetFailed|------------------>+
       |           |               +---------+                   |
       |           |                                             |
       |           | Unknown Job   +--------+                    |
       |PollSaltJob|-------------->|UnsetJob|------------------->+
       |           |               +--------+                    |
       |           |                                             |
       |           | Job Succeed   +--------+                    |
       |           |-------------->|Job=DONE|------------------->+
       +-----------+               +--------+                    |
            | Job in progress                                    |
            |                                                    |
            +----------------------------------------------------+

================
= Steady state =
================

Once the volume is deployed, we update, with a synchronous Salt call, the
`deviceName` status field at each reconciliation loop iteration. This field
contains the name of the underlying block device (as found under `/dev`).

===================
= Finalize Volume =
===================

`Pending` volumes cannot be deleted (because we don't know where we are in the
creation process), so we reschedule the request until the volume becomes either
`Failed` or `Available`.

For volumes with no backing PersistentVolume we directly go reclaim the storage
on the node and upon completion we remove our finalizer to let Kubernetes delete
us.

If we do have a backing PersistentVolume, we delete it (if it's not already in a
terminating state) and watch for the moment when it becomes unused (this is done
by rescheduling). Once the backing PersistentVolume becomes unused, we go
reclaim its storage and remove the finalizers to let the object be deleted.

  -----                                                            ------
 (START)                                                          ( STOP )
  -----                                                            ------
    |                                                                ^
    |                                                                |
    v                                                                |
+--------+ YES                                                    +-------+
|Pending?|------------------------------------------------------->|Requeue|
+--------+                                                        +-------+
    | NO                                                             ^
    v                                                                |
+--------+ YES        +----------------+ NO  +--------+              |
| HasPv? |----------->|IsPvTerminating?|---->|DeletePV|------------->|
+--------+            +----------------+     +--------+              |
    | NO                     | YES                                   |
    |                        v                                       |
    |              YES +-----------+ NO                              |
    |<-----------------|IsPvUnused?|-------------------------------->|
    |                  +-----------+                                 |
    |                                                                |
    |            +--------------------+   +--------------+           |
    |      +---->|SpawnUnprepareVolume|-->|SetTerminating|---------->|
    |      |     +--------------------+   +--------------+           |
    |      | NO                                                      |
    |      |                                                         |
    |   +----+ DONE  +-----------------+   +---------------------+   |
    +-->|Job?|------>|RemovePvFinalizer|-->|RemoveVolumeFinalizer|-->|
        +----+       +-----------------+   +---------------------+   |
          | YES                                                      |
          v                                                          |
     +-----------+ Job Failed           +---------+                  |
     |           |--------------------->|SetFailed|----------------->|
     |           |                      +---------+                  |
     |           |                                                   |
     |           | Unknown Job          +--------+                   |
     |PollSaltJob|--------------------->|UnsetJob|------------------>|
     |           |                      +--------+                   |
     |           |                                                   |
     |           | Job Succeed          +--------+                   |
     |           |--------------------->|Job=DONE|------------------>|
     +-----------+                      +--------+                   |
          | Job in progress                                          |
          |                                                          |
          +----------------------------------------------------------+

}}} */

const VOLUME_PROTECTION = "storage.metalk8s.scality.com/volume-protection"
const JOB_DONE_MARKER = "DONE"

var log = logf.Log.WithName("volume-controller")

type deviceInfo struct {
	size int64  // Size of the device (in bytes)
	path string // Reliable path to the device.
}

// VolumeReconciler reconciles a Volume object
type VolumeReconciler struct {
	client.Client
	Scheme   *runtime.Scheme
	recorder record.EventRecorder
	salt     *salt.Client
	devices  map[string]deviceInfo
}

// Trace a state transition, using logging and Kubernetes events.
func (self *VolumeReconciler) traceStateTransition(
	volume *storagev1alpha1.Volume, oldPhase storagev1alpha1.VolumePhase,
) {
	newPhase := volume.ComputePhase()

	// Nothing to trace if there is no transition.
	if newPhase == oldPhase {
		return
	}

	reqLogger := log.WithValues("Volume.Name", volume.Name)

	self.recorder.Eventf(
		volume, corev1.EventTypeNormal, "StateTransition",
		"volume phase transition from '%s' to '%s'",
		oldPhase, newPhase,
	)
	reqLogger.Info(
		"volume phase transition: requeue",
		"Volume.OldPhase", oldPhase,
		"Volume.NewPhase", newPhase,
	)
}

// Commit the Volume Status update.
func (self *VolumeReconciler) updateVolumeStatus(
	ctx context.Context,
	volume *storagev1alpha1.Volume,
	oldPhase storagev1alpha1.VolumePhase,
) (reconcile.Result, error) {
	reqLogger := log.WithValues("Volume.Name", volume.Name)

	if err := self.Client.Status().Update(ctx, volume); err != nil {
		reqLogger.Error(err, "cannot update Volume status: requeue")
		return delayedRequeue(err)
	}

	self.traceStateTransition(volume, oldPhase)
	// Status updated: reschedule to move forward.
	return requeue(nil)
}

// Put the volume into Failed state.
func (self *VolumeReconciler) setFailedVolumeStatus(
	ctx context.Context,
	volume *storagev1alpha1.Volume,
	pv *corev1.PersistentVolume,
	reason storagev1alpha1.ConditionReason,
	format string,
	args ...interface{},
) (reconcile.Result, error) {
	reqLogger := log.WithValues("Volume.Name", volume.Name)
	oldPhase := volume.ComputePhase()

	volume.SetFailedStatus(reason, format, args...)
	if _, err := self.updateVolumeStatus(ctx, volume, oldPhase); err != nil {
		return delayedRequeue(err)
	}
	// If a PV is provided, move it to Failed state as well.
	if pv != nil {
		pv.Status = corev1.PersistentVolumeStatus{
			Phase:   corev1.VolumeFailed,
			Message: "the owning volume failed",
			Reason:  "OwnerFailed",
		}
		if err := self.Client.Status().Update(ctx, pv); err != nil {
			reqLogger.Error(
				err, "cannot update PersistentVolume status: requeue",
				"PersistentVolume.Name", pv.Name,
			)
			return delayedRequeue(err)
		}
	}
	return requeue(nil)
}

// Put the volume into Pending state.
func (self *VolumeReconciler) setPendingVolumeStatus(
	ctx context.Context, volume *storagev1alpha1.Volume, job string,
) (reconcile.Result, error) {
	oldPhase := volume.ComputePhase()

	volume.SetPendingStatus(job)
	if _, err := self.updateVolumeStatus(ctx, volume, oldPhase); err != nil {
		return delayedRequeue(err)
	}
	return requeue(nil)
}

// Put the volume into Available state.
func (self *VolumeReconciler) setAvailableVolumeStatus(
	ctx context.Context, volume *storagev1alpha1.Volume,
) (reconcile.Result, error) {
	oldPhase := volume.ComputePhase()

	volume.SetAvailableStatus()
	if _, err := self.updateVolumeStatus(ctx, volume, oldPhase); err != nil {
		return delayedRequeue(err)
	}
	return requeue(nil)
}

// Put the volume into Terminating state.
func (self *VolumeReconciler) setTerminatingVolumeStatus(
	ctx context.Context, volume *storagev1alpha1.Volume, job string,
) (reconcile.Result, error) {
	oldPhase := volume.ComputePhase()

	volume.SetTerminatingStatus(job)
	if _, err := self.updateVolumeStatus(ctx, volume, oldPhase); err != nil {
		return delayedRequeue(err)
	}
	return requeue(nil)
}

// Add the volume-protection on the volume (if not already present).
func (self *VolumeReconciler) addVolumeFinalizer(
	ctx context.Context, volume *storagev1alpha1.Volume,
) error {
	finalizers := volume.GetFinalizers()
	volume.SetFinalizers(SliceAppendUnique(finalizers, VOLUME_PROTECTION))
	return self.Client.Update(ctx, volume)
}

// Remove the volume-protection on the volume (if not already present).
func (self *VolumeReconciler) removeVolumeFinalizer(
	ctx context.Context, volume *storagev1alpha1.Volume,
) error {
	finalizers := volume.GetFinalizers()
	volume.SetFinalizers(SliceRemoveValue(finalizers, VOLUME_PROTECTION))
	return self.Client.Update(ctx, volume)
}

// Get the PersistentVolume associated to the given volume.
//
// Return `nil` if no such volume exists.
func (self *VolumeReconciler) getPersistentVolume(
	ctx context.Context, volume *storagev1alpha1.Volume,
) (*corev1.PersistentVolume, error) {
	pv := &corev1.PersistentVolume{}
	key := types.NamespacedName{Namespace: "", Name: volume.Name}

	if err := self.Client.Get(ctx, key, pv); err != nil {
		if errors.IsNotFound(err) {
			return nil, nil
		}
		return nil, err
	}
	if !metav1.IsControlledBy(pv, volume) {
		return nil, fmt.Errorf(
			"name conflict: PersistentVolume %s not owned by Volume %s",
			pv.Name, volume.Name,
		)
	}

	return pv, nil
}

// Get the storage class identified by the given name.
func (self *VolumeReconciler) getStorageClass(
	ctx context.Context, name string,
) (*storagev1.StorageClass, error) {
	sc := &storagev1.StorageClass{}
	key := types.NamespacedName{Namespace: "", Name: name}

	if err := self.Client.Get(ctx, key, sc); err != nil {
		return nil, err
	}
	return sc, nil
}

// Remove the volume-protection on the PV (if not already present).
func (self *VolumeReconciler) removePvFinalizer(
	ctx context.Context, pv *corev1.PersistentVolume,
) error {
	finalizers := pv.GetFinalizers()
	pv.SetFinalizers(SliceRemoveValue(finalizers, VOLUME_PROTECTION))
	return self.Client.Update(ctx, pv)
}

type stateSetter func(
	context.Context, *storagev1alpha1.Volume, string,
) (reconcile.Result, error)

type jobSuccessCallback func(map[string]interface{}) (reconcile.Result, error)

// Poll a Salt state job.
func (self *VolumeReconciler) pollSaltJob(
	ctx context.Context,
	stepName string,
	volume *storagev1alpha1.Volume,
	pv *corev1.PersistentVolume,
	setState stateSetter,
	reason storagev1alpha1.ConditionReason,
	onSuccess jobSuccessCallback,
) (reconcile.Result, error) {
	nodeName := string(volume.Spec.NodeName)
	reqLogger := log.WithValues(
		"Volume.Name", volume.Name, "Volume.NodeName", nodeName,
	)

	job, err := salt.JobFromString(volume.Status.Job)
	if err != nil {
		reqLogger.Error(err, "cannot parse Salt job from Volume status")
		return self.setFailedVolumeStatus(
			ctx, volume, pv, reason, "cannot parse Salt job from Volume status",
		)
	}
	if result, err := self.salt.PollJob(ctx, job, nodeName); err != nil {
		reqLogger.Error(
			err, fmt.Sprintf("failed to poll Salt job '%s' status", job.Name),
		)
		// This one is not retryable.
		if failure, ok := err.(*salt.AsyncJobFailed); ok {
			self.recorder.Eventf(
				volume, corev1.EventTypeWarning, "SaltCall",
				"step '%s' failed", stepName,
			)
			return self.setFailedVolumeStatus(
				ctx, volume, pv, reason,
				"Salt job '%s' failed with: %s", job.Name, failure.Error(),
			)
		}
		// Job salt not found or failed to run, let's retry.
		job.ID = ""
		return setState(ctx, volume, job.String())
	} else {
		if result == nil {
			reqLogger.Info(
				fmt.Sprintf("Salt job '%s' still in progress", job.Name),
			)
			return delayedRequeue(nil)
		}
		self.recorder.Eventf(
			volume, corev1.EventTypeNormal, "SaltCall",
			"step '%s' succeeded", stepName,
		)
		return onSuccess(result)
	}
}

// Return the saltenv to use on the given node.
func (self *VolumeReconciler) fetchSaltEnv(
	ctx context.Context, nodeName string,
) (string, error) {
	node := &corev1.Node{}
	key := types.NamespacedName{Namespace: "", Name: nodeName}

	if err := self.Client.Get(ctx, key, node); err != nil {
		return "", err
	}
	versionKey := "metalk8s.scality.com/version"
	if version, found := node.Labels[versionKey]; found {
		return fmt.Sprintf("metalk8s-%s", version), nil
	}
	return "", fmt.Errorf("label %s not found on node %s", versionKey, nodeName)
}

// Controller RBAC settings

//  - Volume custom resources
//+kubebuilder:rbac:groups=storage.metalk8s.scality.com,resources=volumes,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=storage.metalk8s.scality.com,resources=volumes/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=storage.metalk8s.scality.com,resources=volumes/finalizers,verbs=update

//  - Transition events
//+kubebuilder:rbac:groups="",resources=events,verbs=create;patch

//  - Owned PersistentVolumes
//+kubebuilder:rbac:groups="",resources=persistentvolumes,verbs=create;delete;get;list;patch;update;watch

//  - Read referenced StorageClasses
//+kubebuilder:rbac:groups=storage.k8s.io,resources=storageclasses,verbs=get;list;watch

//  - Read Node's MetalK8s version
//+kubebuilder:rbac:groups="",resources=nodes,verbs=get;list;watch

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (self *VolumeReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	reqLogger := log.WithValues("Request.Name", req.Name)
	reqLogger.Info("reconciling volume: START")
	defer reqLogger.Info("reconciling volume: STOP")

	// Fetch the requested Volume object.
	//
	// The reconciliation request can be triggered by either a Volume or a
	// PersistentVolume owned by a Volume (we're watching both), but because the
	// lifetime of a Volume always span over the whole lifetime of the backing
	// PersistentVolume (and they have the same name) it is safe to always
	// lookup a Volume here.
	volume := &storagev1alpha1.Volume{}
	err := self.Client.Get(ctx, req.NamespacedName, volume)
	if err != nil {
		if errors.IsNotFound(err) {
			// Volume not found:
			// => all the finalizers have been removed & Volume has been deleted
			// => there is nothing left to do
			reqLogger.Info("volume already deleted: nothing to do")
			return endReconciliation()
		}
		reqLogger.Error(err, "cannot read Volume: requeue")
		return delayedRequeue(err)
	}
	if err := volume.IsValid(); err != nil {
		return self.setFailedVolumeStatus(
			ctx, volume, nil, storagev1alpha1.ReasonInternalError,
			"invalid volume: %s", err.Error(),
		)
	}
	saltenv, err := self.fetchSaltEnv(ctx, string(volume.Spec.NodeName))
	if err != nil {
		reqLogger.Error(err, "cannot compute saltenv")
		return delayedRequeue(err)
	}
	// Check if the volume is marked for deletion (i.e., deletion tstamp is set).
	if !volume.GetDeletionTimestamp().IsZero() {
		// Pending volume: can do nothing but wait for stabilization.
		if volume.ComputePhase() == storagev1alpha1.VolumePending {
			reqLogger.Info("pending volume cannot be finalized: requeue")
			// Do not return here! We need to re-enter deployVolume to keep
			// polling the Salt job and make progress.
		} else {
			return self.finalizeVolume(ctx, volume, saltenv)
		}
	}
	// Skip volume stuck waiting for deletion or a manual fix.
	if condition := volume.IsInUnrecoverableFailedState(); condition != nil {
		reqLogger.Info(
			"volume stuck in error state: do nothing",
			"Error.Code", condition.Reason,
			"Error.Message", condition.Message,
		)
		return endReconciliation()
	}
	// Check if a PV already exists for this volume.
	pv, err := self.getPersistentVolume(ctx, volume)
	if err != nil {
		reqLogger.Error(
			err, "error while looking for backing PersistentVolume: requeue",
			"PersistentVolume.Name", volume.Name,
		)
		return delayedRequeue(err)
	}
	// PV doesn't exist: deploy the volume to create it.
	if pv == nil {
		return self.deployVolume(ctx, volume, saltenv)
	}
	// Else, check its health.
	if pv.Status.Phase == corev1.VolumeFailed {
		_, err := self.setFailedVolumeStatus(
			ctx, volume, nil, storagev1alpha1.ReasonUnavailableError,
			"backing PersistentVolume is in a failed state (%s): %s",
			pv.Status.Reason, pv.Status.Message,
		)
		return delayedRequeue(err)
	}
	if _, err = self.setAvailableVolumeStatus(ctx, volume); err != nil {
		return delayedRequeue(err)
	}
	reqLogger.Info("backing PersistentVolume is healthy")
	return self.refreshDeviceName(ctx, volume, pv)
}

// Deploy a volume (i.e prepare the storage and create a PV).
func (self *VolumeReconciler) deployVolume(
	ctx context.Context,
	volume *storagev1alpha1.Volume,
	saltenv string,
) (reconcile.Result, error) {
	nodeName := string(volume.Spec.NodeName)
	reqLogger := log.WithValues(
		"Volume.Name", volume.Name, "Volume.NodeName", nodeName,
	)
	job, err := salt.JobFromString(volume.Status.Job)
	if err != nil {
		reqLogger.Error(err, "cannot parse Salt job from Volume status")
		return requeue(err)
	}

	switch job.Name {
	// Since it's the first step, the name can be unset the very first time.
	case "", "PrepareVolume":
		return self.prepareStorage(ctx, volume, saltenv, job)
	case "GetDeviceInfo":
		return self.getStorageSize(ctx, volume, job)
	default:
		// Shouldn't happen, except if someome somehow tampered our status field…
		return self.setFailedVolumeStatus(
			ctx, volume, nil, storagev1alpha1.ReasonCreationError,
			"Tampered Salt job handle: invalid name (%s)", job.Name,
		)
	}
}

// Finalize a volume marked for deletion.
func (self *VolumeReconciler) finalizeVolume(
	ctx context.Context,
	volume *storagev1alpha1.Volume,
	saltenv string,
) (reconcile.Result, error) {
	reqLogger := log.WithValues("Volume.Name", volume.Name)
	// Check if a PV is associated to the volume.
	pv, err := self.getPersistentVolume(ctx, volume)
	if err != nil {
		reqLogger.Error(
			err, "error while looking for backing PersistentVolume: requeue",
			"PersistentVolume.Name", volume.Name,
		)
		return delayedRequeue(err)
	}

	// If we have a backing PV we delete it (the finalizer will keep it alive).
	if pv != nil && pv.GetDeletionTimestamp().IsZero() {
		if err := self.Client.Delete(ctx, pv); err != nil {
			reqLogger.Error(
				err, "cannot delete PersistentVolume: requeue",
				"PersistentVolume.Name", volume.Name,
			)
			return delayedRequeue(err)
		}
		reqLogger.Info(
			"deleting backing PersistentVolume",
			"PersistentVolume.Name", pv.Name,
		)
		self.recorder.Event(
			volume, corev1.EventTypeNormal, "PvDeletion",
			"backing PersistentVolume deleted",
		)
		return requeue(nil)
	}

	// If we don't have a PV or it's only used by us we can reclaim the storage.
	if pv == nil || isPersistentVolumeUnused(pv) {
		return self.reclaimStorage(ctx, volume, pv, saltenv)
	}

	// PersistentVolume still in use: wait before reclaiming the storage.
	return delayedRequeue(nil)
}

func (self *VolumeReconciler) refreshDeviceName(
	ctx context.Context,
	volume *storagev1alpha1.Volume,
	pv *corev1.PersistentVolume,
) (reconcile.Result, error) {
	nodeName := string(volume.Spec.NodeName)
	reqLogger := log.WithValues(
		"Volume.Name", volume.Name, "Volume.NodeName", nodeName,
	)

	if pv.Spec.PersistentVolumeSource.Local == nil {
		reqLogger.Info("skipping volume: not a local storage")
		return endReconciliation()
	}
	path := pv.Spec.PersistentVolumeSource.Local.Path

	name, err := self.salt.GetDeviceName(ctx, nodeName, volume.Name, path)
	if err != nil {
		self.recorder.Event(
			volume, corev1.EventTypeNormal, "SaltCall",
			"device path resolution failed",
		)
		reqLogger.Error(err, "cannot get device name from Salt response")
		return delayedRequeue(err)
	}
	if volume.Status.DeviceName != name {
		volume.Status.DeviceName = name
		reqLogger.Info("update device name", "Volume.DeviceName", name)
		return self.setAvailableVolumeStatus(ctx, volume)
	}

	return endReconciliation()
}

func (self *VolumeReconciler) prepareStorage(
	ctx context.Context,
	volume *storagev1alpha1.Volume,
	saltenv string,
	job *salt.JobHandle,
) (reconcile.Result, error) {
	nodeName := string(volume.Spec.NodeName)
	reqLogger := log.WithValues(
		"Volume.Name", volume.Name, "Volume.NodeName", nodeName,
	)

	switch job.ID {
	case "": // No job in progress: call Salt to prepare the volume.
		// Set volume-protection finalizer on the volume.
		if err := self.addVolumeFinalizer(ctx, volume); err != nil {
			reqLogger.Error(err, "cannot set volume-protection: requeue")
			return delayedRequeue(err)
		}
		job, err := self.salt.PrepareVolume(ctx, nodeName, volume.Name, saltenv)
		if err != nil {
			reqLogger.Error(err, "failed to run PrepareVolume")
			return delayedRequeue(err)
		} else {
			reqLogger.Info("start to prepare the volume")
			self.recorder.Event(
				volume, corev1.EventTypeNormal, "SaltCall",
				"volume provisioning step 1/2 started",
			)
			return self.setPendingVolumeStatus(ctx, volume, job.String())
		}
	case JOB_DONE_MARKER: // Storage is ready, let's get its information.
		job.Name = "GetDeviceInfo"
		job.ID = ""
		return self.getStorageSize(ctx, volume, job)
	default: // PrepareVolume in progress: poll its state.
		return self.pollSaltJob(
			ctx, "volume provisioning (1/2)", volume, nil,
			self.setPendingVolumeStatus,
			storagev1alpha1.ReasonCreationError,
			func(_ map[string]interface{}) (reconcile.Result, error) {
				job.ID = JOB_DONE_MARKER
				return self.setPendingVolumeStatus(ctx, volume, job.String())
			},
		)
	}
}

func (self *VolumeReconciler) getStorageSize(
	ctx context.Context,
	volume *storagev1alpha1.Volume,
	job *salt.JobHandle,
) (reconcile.Result, error) {
	nodeName := string(volume.Spec.NodeName)
	reqLogger := log.WithValues(
		"Volume.Name", volume.Name, "Volume.NodeName", nodeName,
	)

	switch job.ID {
	case "": // No job in progress: call Salt to get the volume information.
		job, err := self.salt.GetDeviceInfo(ctx, nodeName, volume.Name)
		if err != nil {
			reqLogger.Error(err, "failed to run GetDeviceInfo")
			return delayedRequeue(err)
		} else {
			reqLogger.Info("try to retrieve the volume information")
			self.recorder.Event(
				volume, corev1.EventTypeNormal, "SaltCall",
				"volume provisioning step 2/2 started",
			)
			return self.setPendingVolumeStatus(ctx, volume, job.String())
		}
	case JOB_DONE_MARKER: // We have everything we need: let's create the PV!
		return self.createPersistentVolume(ctx, volume)
	default: // GetDeviceInfo in progress: poll its state.
		return self.pollSaltJob(
			ctx, "volume provisioning (2/2)", volume, nil,
			self.setPendingVolumeStatus,
			storagev1alpha1.ReasonCreationError,
			func(result map[string]interface{}) (reconcile.Result, error) {
				info, err := parseDeviceInfo(result)
				if err != nil {
					reqLogger.Error(err, "cannot get device info from Salt response")
					self.recorder.Event(
						volume, corev1.EventTypeNormal, "SaltCall",
						"volume provisioning step 2/2 failed",
					)
					return self.setFailedVolumeStatus(
						ctx, volume, nil, storagev1alpha1.ReasonCreationError,
						"Salt job '%s' failed with: %s", job.Name, err.Error(),
					)
				}
				self.devices[volume.Name] = *info
				job.ID = JOB_DONE_MARKER
				return self.setPendingVolumeStatus(ctx, volume, job.String())
			},
		)
	}
}

// Create a PersistentVolume in the Kubernetes API server.
func (self *VolumeReconciler) createPersistentVolume(
	ctx context.Context, volume *storagev1alpha1.Volume,
) (reconcile.Result, error) {
	reqLogger := log.WithValues(
		"Volume.Name", volume.Name,
		"Volume.NodeName", string(volume.Spec.NodeName),
	)

	// Fetch referenced storage class.
	scName := volume.Spec.StorageClassName
	sc, err := self.getStorageClass(ctx, scName)
	if err != nil {
		errmsg := fmt.Sprintf("cannot get StorageClass '%s'", scName)
		reqLogger.Error(err, errmsg, "StorageClass.Name", scName)
		return delayedRequeue(err)
	}
	deviceInfo, found := self.devices[volume.Name]
	if !found {
		reqLogger.Error(err, "no device info")
		// Reschedule a call to `metalk8s_volumes.device_info`.
		job := salt.JobHandle{Name: "GetDeviceInfo", ID: ""}
		return self.setPendingVolumeStatus(ctx, volume, job.String())
	}
	// Create the PersistentVolume object.
	pv, err := newPersistentVolume(volume, sc, deviceInfo)
	if err != nil {
		reqLogger.Error(
			err, "cannot create the PersistentVolume object: requeue",
			"PersistentVolume.Name", volume.Name,
		)
		return delayedRequeue(err)
	}
	// Set Volume instance as the owner and controller.
	err = controllerutil.SetControllerReference(volume, pv, self.Scheme)
	if err != nil {
		reqLogger.Error(
			err, "cannot become owner of the PersistentVolume: requeue",
			"PersistentVolume.Name", volume.Name,
		)
		return delayedRequeue(err)
	}
	// Create the PV!
	if err := self.Client.Create(ctx, pv); err != nil {
		reqLogger.Error(
			err, "cannot create PersistentVolume: requeue",
			"PersistentVolume.Name", volume.Name,
		)
		return delayedRequeue(err)
	}
	reqLogger.Info(
		"creating a new PersistentVolume", "PersistentVolume.Name", pv.Name,
	)

	self.recorder.Event(
		volume, corev1.EventTypeNormal, "PvCreation",
		"backing PersistentVolume created",
	)
	return self.setAvailableVolumeStatus(ctx, volume)
}

// Build a PersistentVolume from a Volume object.
//
// Arguments
//
//	volume:       a Volume object
//	storageClass: a StorageClass object
//	deviceInfo:   the device information
//
// Returns
//
//	The PersistentVolume representing the given Volume.
func newPersistentVolume(
	volume *storagev1alpha1.Volume,
	storageClass *storagev1.StorageClass,
	deviceInfo deviceInfo,
) (*corev1.PersistentVolume, error) {
	volumeSize := *resource.NewQuantity(deviceInfo.size, resource.BinarySI)
	// We must have `fsType` as parameter, otherwise we can't create our PV.
	scName := volume.Spec.StorageClassName
	fsType, found := storageClass.Parameters["fsType"]
	if !found {
		return nil, fmt.Errorf(
			"missing field 'parameters.fsType' in StorageClass '%s'", scName,
		)
	}

	pv := corev1.PersistentVolume{
		ObjectMeta: volume.Spec.Template.Metadata,
		Spec:       volume.Spec.Template.Spec,
	}
	pv.ObjectMeta.Name = volume.Name
	pv.ObjectMeta.Finalizers = append(
		pv.ObjectMeta.Finalizers, VOLUME_PROTECTION,
	)
	pv.Spec.AccessModes = []corev1.PersistentVolumeAccessMode{
		corev1.ReadWriteOnce,
	}
	pv.Spec.Capacity = map[corev1.ResourceName]resource.Quantity{
		corev1.ResourceStorage: volumeSize,
	}
	pv.Spec.MountOptions = storageClass.MountOptions
	pv.Spec.VolumeMode = &volume.Spec.Mode
	pv.Spec.PersistentVolumeSource = corev1.PersistentVolumeSource{
		Local: &corev1.LocalVolumeSource{
			Path:   deviceInfo.path,
			FSType: &fsType,
		},
	}
	pv.Spec.PersistentVolumeReclaimPolicy = "Retain"
	pv.Spec.StorageClassName = volume.Spec.StorageClassName
	pv.Spec.NodeAffinity = nodeAffinity(volume.Spec.NodeName)

	return &pv, nil
}

func nodeAffinity(node types.NodeName) *corev1.VolumeNodeAffinity {
	selector := corev1.NodeSelector{
		NodeSelectorTerms: []corev1.NodeSelectorTerm{
			{
				MatchExpressions: []corev1.NodeSelectorRequirement{
					{
						Key:      "kubernetes.io/hostname",
						Operator: corev1.NodeSelectorOpIn,
						Values:   []string{string(node)},
					},
				},
			},
		},
	}
	affinity := corev1.VolumeNodeAffinity{
		Required: &selector,
	}
	return &affinity
}

// Check if a PersistentVolume is only used by us.
func isPersistentVolumeUnused(pv *corev1.PersistentVolume) bool {
	reqLogger := log.WithValues("PersistentVolume.Name", pv.Name)

	switch pv.Status.Phase {
	case corev1.VolumeBound:
		reqLogger.Info(
			"backing PersistentVolume is bound: cannot delete volume",
		)
		return false
	case corev1.VolumePending:
		reqLogger.Info(
			"backing PersistentVolume is pending: waiting for stabilization",
		)
		return false
	case corev1.VolumeAvailable, corev1.VolumeReleased, corev1.VolumeFailed:
		reqLogger.Info("the backing PersistentVolume is in a removable state")
		finalizers := pv.GetFinalizers()
		if len(finalizers) == 1 && finalizers[0] == VOLUME_PROTECTION {
			reqLogger.Info("the backing PersistentVolume is unused")
			return true
		}
		return false
	default:
		phase := pv.Status.Phase
		errmsg := fmt.Sprintf(
			"unexpected PersistentVolume status (%+v): do nothing", phase,
		)
		reqLogger.Info(errmsg, "PersistentVolume.Status", phase)
		return false
	}
}

// Destroy the give PersistentVolume.
func (self *VolumeReconciler) reclaimStorage(
	ctx context.Context,
	volume *storagev1alpha1.Volume,
	pv *corev1.PersistentVolume,
	saltenv string,
) (reconcile.Result, error) {
	nodeName := string(volume.Spec.NodeName)
	reqLogger := log.WithValues(
		"Volume.Name", volume.Name, "Volume.NodeName", nodeName,
	)
	job, err := salt.JobFromString(volume.Status.Job)
	if err != nil {
		reqLogger.Error(err, "cannot parse Salt job from Volume status")
		return requeue(err)
	}
	jobId := job.ID

	// Ignore existing Job ID in Failed case (no job are running), JID only here
	// for debug (which is now useless as we're going to delete the Volume).
	if volume.ComputePhase() == storagev1alpha1.VolumeFailed {
		jobId = ""
	}

	switch jobId {
	case "": // No job in progress: call Salt to unprepare the volume.
		job, err := self.salt.UnprepareVolume(
			ctx, nodeName, volume.Name, saltenv,
		)
		if err != nil {
			reqLogger.Error(err, "failed to run UnprepareVolume")
			return delayedRequeue(err)
		} else {
			reqLogger.Info("start to unprepare the volume")
			self.recorder.Event(
				volume, corev1.EventTypeNormal, "SaltCall",
				"volume finalization started",
			)
			return self.setTerminatingVolumeStatus(ctx, volume, job.String())
		}
	case JOB_DONE_MARKER: // Salt job is done, now let's remove the finalizers.
		if pv != nil {
			if err := self.removePvFinalizer(ctx, pv); err != nil {
				reqLogger.Error(err, "cannot remove PersistentVolume finalizer")
				return delayedRequeue(err)
			}
			reqLogger.Info("PersistentVolume finalizer removed")
			self.recorder.Event(
				volume, corev1.EventTypeNormal, "VolumeFinalization",
				"storage reclaimed",
			)
		}
		if err := self.removeVolumeFinalizer(ctx, volume); err != nil {
			reqLogger.Error(err, "cannot remove Volume finalizer")
			return delayedRequeue(err)
		}
		reqLogger.Info("volume finalizer removed")
		return endReconciliation()
	default: // UnprepareVolume in progress: poll its state.
		return self.pollSaltJob(
			ctx, "volume finalization", volume, pv,
			self.setTerminatingVolumeStatus,
			storagev1alpha1.ReasonDestructionError,
			func(_ map[string]interface{}) (reconcile.Result, error) {
				job.ID = JOB_DONE_MARKER
				return self.setTerminatingVolumeStatus(ctx, volume, job.String())
			},
		)
	}
}

// Trigger a reschedule after a short delay.
func delayedRequeue(err error) (reconcile.Result, error) {
	delay := 10 * time.Second
	return reconcile.Result{Requeue: err == nil, RequeueAfter: delay}, err
}

// Trigger a reschedule as soon as possible.
func requeue(err error) (reconcile.Result, error) {
	return reconcile.Result{Requeue: err == nil}, err
}

// Don't trigger a reschedule, we're done.
func endReconciliation() (reconcile.Result, error) {
	return reconcile.Result{}, nil
}

// Return the credential to use to authenticate with Salt API.
func getAuthCredential(config *rest.Config) *salt.Credential {
	if config.BearerToken == "" {
		panic("must use a BearerToken for SaltAPI authentication")
	}
	log.Info("using ServiceAccount bearer token")
	return salt.NewCredential(
		// FIXME: this should depend on the actual SA used
		"system:serviceaccount:kube-system:storage-operator-controller-manager",
		config.BearerToken,
		salt.Bearer,
	)
}

// Extract the device info from a Salt result.
func parseDeviceInfo(result map[string]interface{}) (*deviceInfo, error) {
	size_str, ok := result["size"].(string)
	if !ok {
		return nil, fmt.Errorf(
			"cannot find a string value for key 'size' in %v", result,
		)
	}
	path, ok := result["path"].(string)
	if !ok {
		return nil, fmt.Errorf(
			"cannot find a string value for key 'path' in %v", result,
		)
	}

	if size, err := strconv.ParseInt(size_str, 10, 64); err != nil {
		return nil, errorsng.Wrapf(
			err, "cannot parse device size (%s)", size_str,
		)
	} else {
		return &deviceInfo{size, path}, nil
	}
}

// SetupWithManager sets up the controller with the Manager.
func (r *VolumeReconciler) SetupWithManager(mgr ctrl.Manager) error {
	config := mgr.GetConfig()
	caCertData := config.CAData
	if len(caCertData) == 0 {
		log.Info("CAData is empty, fallbacking on CAFile")
		cert, err := ioutil.ReadFile(config.CAFile)
		if err != nil {
			return errorsng.Wrapf(
				err, "cannot read CA cert file (%s)", config.CAFile,
			)
		}
		caCertData = cert
	}
	saltClient, err := salt.NewClient(getAuthCredential(config), caCertData)
	if err != nil {
		return err
	}

	r.recorder = mgr.GetEventRecorderFor("volume-controller")
	r.salt = saltClient
	r.devices = make(map[string]deviceInfo)

	return ctrl.NewControllerManagedBy(mgr).
		For(&storagev1alpha1.Volume{}).
		Owns(&corev1.PersistentVolume{}).
		Complete(r)
}

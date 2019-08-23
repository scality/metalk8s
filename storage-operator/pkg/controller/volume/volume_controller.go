package volume

import (
	"context"
	b64 "encoding/base64"
	"fmt"
	"time"

	storagev1alpha1 "github.com/scality/metalk8s/storage-operator/pkg/apis/storage/v1alpha1"
	"github.com/scality/metalk8s/storage-operator/pkg/salt"
	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/record"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	logf "sigs.k8s.io/controller-runtime/pkg/runtime/log"
	"sigs.k8s.io/controller-runtime/pkg/source"
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

Otherwise we proceed with the PersistentVolume creation (which require an extra
Salt call, synchronous this time, to get the volume size), taking care of
putting a finalizer on the PersistentVolume (so that its lifetime is tied to
ours) and setting ourself as the owner of the PersistentVolume.

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

// Add creates a new Volume Controller and adds it to the Manager. The Manager will set fields on the Controller
// and Start it when the Manager is Started.
func Add(mgr manager.Manager) error {
	return add(mgr, newReconciler(mgr))
}

// newReconciler returns a new reconcile.Reconciler
func newReconciler(mgr manager.Manager) reconcile.Reconciler {
	return &ReconcileVolume{
		client:   mgr.GetClient(),
		scheme:   mgr.GetScheme(),
		recorder: mgr.GetRecorder("volume-controller"),
		salt:     salt.NewClient(getAuthCredential(mgr.GetConfig())),
	}
}

// add adds a new Controller to mgr with r as the reconcile.Reconciler
func add(mgr manager.Manager, r reconcile.Reconciler) error {
	// Create a new controller
	c, err := controller.New("volume-controller", mgr, controller.Options{Reconciler: r})
	if err != nil {
		return err
	}

	// Watch for changes to primary resource Volume
	err = c.Watch(&source.Kind{Type: &storagev1alpha1.Volume{}}, &handler.EnqueueRequestForObject{})
	if err != nil {
		return err
	}

	// Watch for changes to secondary resource Pods and requeue the owner Volume
	err = c.Watch(&source.Kind{Type: &corev1.PersistentVolume{}}, &handler.EnqueueRequestForOwner{
		IsController: true,
		OwnerType:    &storagev1alpha1.Volume{},
	})
	if err != nil {
		return err
	}

	return nil
}

// blank assignment to verify that ReconcileVolume implements reconcile.Reconciler
var _ reconcile.Reconciler = &ReconcileVolume{}

// ReconcileVolume reconciles a Volume object
type ReconcileVolume struct {
	// This client, initialized using mgr.Client() above, is a split client
	// that reads objects from the cache and writes to the apiserver
	client   client.Client
	scheme   *runtime.Scheme
	recorder record.EventRecorder
	salt     *salt.Client
}

// Trace a state transition, using logging and Kubernetes events.
func (self *ReconcileVolume) traceStateTransition(
	volume *storagev1alpha1.Volume, oldPhase storagev1alpha1.VolumePhase,
) {
	// Nothing to trace if there is no transition.
	if volume.Status.Phase == oldPhase {
		return
	}

	reqLogger := log.WithValues("Volume.Name", volume.Name)

	self.recorder.Eventf(
		volume, corev1.EventTypeNormal, "StateTransition",
		"volume phase transition from '%s' to '%s'",
		oldPhase, volume.Status.Phase,
	)
	reqLogger.Info(
		"volume phase transition: requeue",
		"Volume.OldPhase", oldPhase,
		"Volume.NewPhase", volume.Status.Phase,
	)
}

// Commit the Volume Status update.
func (self *ReconcileVolume) updateVolumeStatus(
	ctx context.Context,
	volume *storagev1alpha1.Volume,
	oldPhase storagev1alpha1.VolumePhase,
) (reconcile.Result, error) {
	reqLogger := log.WithValues("Volume.Name", volume.Name)

	if err := self.client.Status().Update(ctx, volume); err != nil {
		reqLogger.Error(err, "cannot update Volume status: requeue")
		return delayedRequeue(err)
	}

	self.traceStateTransition(volume, oldPhase)
	// Status updated: reschedule to move forward.
	return requeue(nil)
}

// Put the volume into Failed state.
func (self *ReconcileVolume) setFailedVolumeStatus(
	ctx context.Context,
	volume *storagev1alpha1.Volume,
	pv *corev1.PersistentVolume,
	errorCode storagev1alpha1.VolumeErrorCode,
	format string,
	args ...interface{},
) (reconcile.Result, error) {
	reqLogger := log.WithValues("Volume.Name", volume.Name)
	oldPhase := volume.Status.Phase

	volume.SetFailedStatus(errorCode, format, args...)
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
		if err := self.client.Status().Update(ctx, pv); err != nil {
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
func (self *ReconcileVolume) setPendingVolumeStatus(
	ctx context.Context, volume *storagev1alpha1.Volume, job string,
) (reconcile.Result, error) {
	oldPhase := volume.Status.Phase

	volume.SetPendingStatus(job)
	if _, err := self.updateVolumeStatus(ctx, volume, oldPhase); err != nil {
		return delayedRequeue(err)
	}
	return requeue(nil)
}

// Put the volume into Available state.
func (self *ReconcileVolume) setAvailableVolumeStatus(
	ctx context.Context, volume *storagev1alpha1.Volume,
) (reconcile.Result, error) {
	oldPhase := volume.Status.Phase

	volume.SetAvailableStatus()
	if _, err := self.updateVolumeStatus(ctx, volume, oldPhase); err != nil {
		return delayedRequeue(err)
	}
	return requeue(nil)
}

// Put the volume into Terminating state.
func (self *ReconcileVolume) setTerminatingVolumeStatus(
	ctx context.Context, volume *storagev1alpha1.Volume, job string,
) (reconcile.Result, error) {
	oldPhase := volume.Status.Phase

	volume.SetTerminatingStatus(job)
	if _, err := self.updateVolumeStatus(ctx, volume, oldPhase); err != nil {
		return delayedRequeue(err)
	}
	return requeue(nil)
}

// Add the volume-protection on the volume (if not already present).
func (self *ReconcileVolume) addVolumeFinalizer(
	ctx context.Context, volume *storagev1alpha1.Volume,
) error {
	finalizers := volume.GetFinalizers()
	volume.SetFinalizers(SliceAppendUnique(finalizers, VOLUME_PROTECTION))
	return self.client.Update(ctx, volume)
}

// Remove the volume-protection on the volume (if not already present).
func (self *ReconcileVolume) removeVolumeFinalizer(
	ctx context.Context, volume *storagev1alpha1.Volume,
) error {
	finalizers := volume.GetFinalizers()
	volume.SetFinalizers(SliceRemoveValue(finalizers, VOLUME_PROTECTION))
	return self.client.Update(ctx, volume)
}

// Get the disk size for the volume.
func (self *ReconcileVolume) getDiskSizeForVolume(
	ctx context.Context, volume *storagev1alpha1.Volume,
) (resource.Quantity, error) {
	nodeName := string(volume.Spec.NodeName)
	size, err := self.salt.GetVolumeSize(ctx, nodeName, volume.GetPath())
	if err != nil {
		return *resource.NewQuantity(0, resource.BinarySI), err
	}
	return *resource.NewQuantity(size, resource.BinarySI), err
}

// Get the PersistentVolume associated to the given volume.
//
// Return `nil` if no such volume exists.
func (self *ReconcileVolume) getPersistentVolume(
	ctx context.Context, volume *storagev1alpha1.Volume,
) (*corev1.PersistentVolume, error) {
	pv := &corev1.PersistentVolume{}
	key := types.NamespacedName{Namespace: "", Name: volume.Name}

	if err := self.client.Get(ctx, key, pv); err != nil {
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
func (self *ReconcileVolume) getStorageClass(
	ctx context.Context, name string,
) (*storagev1.StorageClass, error) {
	sc := &storagev1.StorageClass{}
	key := types.NamespacedName{Namespace: "", Name: name}

	if err := self.client.Get(ctx, key, sc); err != nil {
		return nil, err
	}
	return sc, nil
}

// Remove the volume-protection on the PV (if not already present).
func (self *ReconcileVolume) removePvFinalizer(
	ctx context.Context, pv *corev1.PersistentVolume,
) error {
	finalizers := pv.GetFinalizers()
	pv.SetFinalizers(SliceRemoveValue(finalizers, VOLUME_PROTECTION))
	return self.client.Update(ctx, pv)
}

type stateSetter func(
	context.Context, *storagev1alpha1.Volume, string,
) (reconcile.Result, error)

// Poll a Salt state job.
func (self *ReconcileVolume) pollSaltJob(
	ctx context.Context,
	stepName string,
	jobName string,
	volume *storagev1alpha1.Volume,
	pv *corev1.PersistentVolume,
	setState stateSetter,
	errorCode storagev1alpha1.VolumeErrorCode,
) (reconcile.Result, error) {
	nodeName := string(volume.Spec.NodeName)
	reqLogger := log.WithValues(
		"Volume.Name", volume.Name, "Volume.NodeName", nodeName,
	)

	jid := volume.Status.Job
	if result, err := self.salt.PollJob(ctx, jid, nodeName); err != nil {
		reqLogger.Error(
			err, fmt.Sprintf("failed to poll Salt job '%s' status", jobName),
		)
		// This one is not retryable.
		if failure, ok := err.(*salt.AsyncJobFailed); ok {
			self.recorder.Eventf(
				volume, corev1.EventTypeWarning, "SaltCall",
				"step '%s' failed", stepName,
			)
			return self.setFailedVolumeStatus(
				ctx, volume, pv, errorCode,
				"Salt job '%s' failed with %s", jobName, failure.Error(),
			)
		}
		// Job salt not found or failed to run, let's retry.
		return setState(ctx, volume, "")
	} else {
		if result == nil {
			reqLogger.Info(
				fmt.Sprintf("Salt job '%s' still in progress", jobName),
			)
			return delayedRequeue(nil)
		}
		self.recorder.Eventf(
			volume, corev1.EventTypeNormal, "SaltCall",
			"step '%s' succeeded", stepName,
		)
		return setState(ctx, volume, JOB_DONE_MARKER)
	}
}

// Return the saltenv to use on the given node.
func (self *ReconcileVolume) fetchSaltEnv(
	ctx context.Context, nodeName string,
) (string, error) {
	node := &corev1.Node{}
	key := types.NamespacedName{Namespace: "", Name: nodeName}

	if err := self.client.Get(ctx, key, node); err != nil {
		return "", err
	}
	versionKey := "metalk8s.scality.com/version"
	if version, found := node.Labels[versionKey]; found {
		return fmt.Sprintf("metalk8s-%s", version), nil
	}
	return "", fmt.Errorf("label %s not found on node %s", versionKey, nodeName)
}

// Reconcile reads that state of the cluster for a Volume object and makes changes based on the state read
// and what is in the Volume.Spec
// TODO(user): Modify this Reconcile function to implement your Controller logic.  This example creates
// a Pod as an example
// Note:
// The Controller will requeue the Request to be processed again if the returned error is non-nil or
// Result.Requeue is true, otherwise upon completion it will remove the work from the queue.
func (r *ReconcileVolume) Reconcile(request reconcile.Request) (reconcile.Result, error) {
	reqLogger := log.WithValues("Request.Name", request.Name)
	reqLogger.Info("reconciling volume: START")
	defer reqLogger.Info("reconciling volume: STOP")

	ctx, cancel := context.WithCancel(context.TODO())
	defer cancel()

	// Fetch the requested Volume object.
	//
	// The reconciliation request can be triggered by either a Volume or a
	// PersistentVolume owned by a Volume (we're watching both), but because the
	// lifetime of a Volume always span over the whole lifetime of the backing
	// PersistentVolume (and they have the same name) it is safe to always
	// lookup a Volume here.
	volume := &storagev1alpha1.Volume{}
	err := r.client.Get(ctx, request.NamespacedName, volume)
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
		return r.setFailedVolumeStatus(
			ctx, volume, nil, storagev1alpha1.InternalError,
			"invalid volume: %s", err.Error(),
		)
	}
	saltenv, err := r.fetchSaltEnv(ctx, string(volume.Spec.NodeName))
	if err != nil {
		reqLogger.Error(err, "cannot compute saltenv")
		return delayedRequeue(err)
	}
	// Check if the volume is marked for deletion (i.e., deletion tstamp is set).
	if !volume.GetDeletionTimestamp().IsZero() {
		return r.finalizeVolume(ctx, volume, saltenv)
	}
	// Skip volume stuck waiting for deletion or a manual fix.
	if volume.IsInUnrecoverableFailedState() {
		reqLogger.Info(
			"volume stuck in error state: do nothing",
			"Error.Code", volume.Status.ErrorCode,
			"Error.Message", volume.Status.ErrorMessage,
		)
		return endReconciliation()
	}
	// Check if a PV already exists for this volume.
	pv, err := r.getPersistentVolume(ctx, volume)
	if err != nil {
		reqLogger.Error(
			err, "error while looking for backing PersistentVolume: requeue",
			"PersistentVolume.Name", volume.Name,
		)
		return delayedRequeue(err)
	}
	// PV doesn't exist: deploy the volume to create it.
	if pv == nil {
		return r.deployVolume(ctx, volume, saltenv)
	}
	// Else, check its health.
	if pv.Status.Phase == corev1.VolumeFailed {
		_, err := r.setFailedVolumeStatus(
			ctx, volume, nil, storagev1alpha1.UnavailableError,
			"backing PersistentVolume is in a failed state (%s): %s",
			pv.Status.Reason, pv.Status.Message,
		)
		return delayedRequeue(err)
	}
	if _, err = r.setAvailableVolumeStatus(ctx, volume); err != nil {
		return delayedRequeue(err)
	}
	reqLogger.Info("backing PersistentVolume is healthy")
	return endReconciliation()
}

// Deploy a volume (i.e prepare the storage and create a PV).
func (self *ReconcileVolume) deployVolume(
	ctx context.Context,
	volume *storagev1alpha1.Volume,
	saltenv string,
) (reconcile.Result, error) {
	nodeName := string(volume.Spec.NodeName)
	reqLogger := log.WithValues(
		"Volume.Name", volume.Name, "Volume.NodeName", nodeName,
	)

	switch volume.Status.Job {
	case "": // No job in progress: call Salt to prepare the volume.
		// Set volume-protection finalizer on the volume.
		if err := self.addVolumeFinalizer(ctx, volume); err != nil {
			reqLogger.Error(err, "cannot set volume-protection: requeue")
			return delayedRequeue(err)
		}
		jid, err := self.salt.PrepareVolume(ctx, nodeName, volume.Name, saltenv)
		if err != nil {
			reqLogger.Error(err, "failed to run PrepareVolume")
			return delayedRequeue(err)
		} else {
			reqLogger.Info("start to prepare the volume")
			self.recorder.Event(
				volume, corev1.EventTypeNormal, "SaltCall",
				"volume provisioning started",
			)
			return self.setPendingVolumeStatus(ctx, volume, jid)
		}
	case JOB_DONE_MARKER: // Salt job is done, now let's create the PV.
		return self.createPersistentVolume(ctx, volume)
	default: // PrepareVolume in progress: poll its state.
		return self.pollSaltJob(
			ctx, "volume provisioning", "PrepareVolume",
			volume, nil, self.setPendingVolumeStatus,
			storagev1alpha1.CreationError,
		)
	}
}

// Finalize a volume marked for deletion.
func (self *ReconcileVolume) finalizeVolume(
	ctx context.Context,
	volume *storagev1alpha1.Volume,
	saltenv string,
) (reconcile.Result, error) {
	reqLogger := log.WithValues("Volume.Name", volume.Name)

	// Pending volume: can do nothing but wait for stabilization.
	if volume.Status.Phase == storagev1alpha1.VolumePending {
		reqLogger.Info("pending volume cannot be finalized: requeue")
		return delayedRequeue(nil)
	}

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
		if err := self.client.Delete(ctx, pv); err != nil {
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

// Create a PersistentVolume in the Kubernetes API server.
func (self *ReconcileVolume) createPersistentVolume(
	ctx context.Context, volume *storagev1alpha1.Volume,
) (reconcile.Result, error) {
	reqLogger := log.WithValues(
		"Volume.Name", volume.Name,
		"Volume.NodeName", string(volume.Spec.NodeName),
	)

	// Fetch disk size.
	diskSize, err := self.getDiskSizeForVolume(ctx, volume)
	if err != nil {
		reqLogger.Error(err, "call to GetVolumeSize failed")
		return self.setFailedVolumeStatus(
			ctx, volume, nil, storagev1alpha1.CreationError,
			"call to GetVolumeSize failed: %s", err.Error(),
		)
	}
	// Fetch referenced storage class.
	scName := volume.Spec.StorageClassName
	sc, err := self.getStorageClass(ctx, scName)
	if err != nil {
		errmsg := fmt.Sprintf("cannot get StorageClass '%s'", scName)
		reqLogger.Error(err, errmsg, "StorageClass.Name", scName)
		return delayedRequeue(err)
	}
	// Create the PersistentVolume object.
	pv, err := newPersistentVolume(volume, sc, diskSize)
	if err != nil {
		reqLogger.Error(
			err, "cannot create the PersistentVolume object: requeue",
			"PersistentVolume.Name", volume.Name,
		)
		return delayedRequeue(err)
	}
	// Set Volume instance as the owner and controller.
	err = controllerutil.SetControllerReference(volume, pv, self.scheme)
	if err != nil {
		reqLogger.Error(
			err, "cannot become owner of the PersistentVolume: requeue",
			"PersistentVolume.Name", volume.Name,
		)
		return delayedRequeue(err)
	}
	// Create the PV!
	if err := self.client.Create(ctx, pv); err != nil {
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
//     volume:       a Volume object
//     storageClass: a StorageClass object
//     volumeSize:   the volume size
//
// Returns
//     The PersistentVolume representing the given Volume.
func newPersistentVolume(
	volume *storagev1alpha1.Volume,
	storageClass *storagev1.StorageClass,
	volumeSize resource.Quantity,
) (*corev1.PersistentVolume, error) {
	// We only support this mode for now.
	mode := corev1.PersistentVolumeFilesystem

	// We must have `fsType` as parameter, otherwise we can't create our PV.
	scName := volume.Spec.StorageClassName
	fsType, found := storageClass.Parameters["fsType"]
	if !found {
		return nil, fmt.Errorf(
			"missing field 'parameters.fsType' in StorageClass '%s'", scName,
		)
	}

	return &corev1.PersistentVolume{
		ObjectMeta: metav1.ObjectMeta{
			Name:       volume.Name,
			Labels:     map[string]string{},
			Finalizers: []string{VOLUME_PROTECTION},
		},
		Spec: corev1.PersistentVolumeSpec{
			AccessModes: []corev1.PersistentVolumeAccessMode{
				corev1.ReadWriteOnce,
			},
			Capacity: map[corev1.ResourceName]resource.Quantity{
				corev1.ResourceStorage: volumeSize,
			},
			MountOptions: storageClass.MountOptions,
			VolumeMode:   &mode,
			PersistentVolumeSource: corev1.PersistentVolumeSource{
				Local: &corev1.LocalVolumeSource{
					Path:   volume.GetPath(),
					FSType: &fsType,
				},
			},
			PersistentVolumeReclaimPolicy: "Retain",
			StorageClassName:              volume.Spec.StorageClassName,
			NodeAffinity:                  nodeAffinity(volume.Spec.NodeName),
		},
	}, nil
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
func (self *ReconcileVolume) reclaimStorage(
	ctx context.Context,
	volume *storagev1alpha1.Volume,
	pv *corev1.PersistentVolume,
	saltenv string,
) (reconcile.Result, error) {
	nodeName := string(volume.Spec.NodeName)
	reqLogger := log.WithValues(
		"Volume.Name", volume.Name, "Volume.NodeName", nodeName,
	)

	switch volume.Status.Job {
	case "": // No job in progress: call Salt to unprepare the volume.
		jid, err := self.salt.UnprepareVolume(
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
			return self.setTerminatingVolumeStatus(ctx, volume, jid)
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
			ctx, "volume finalization", "UnprepareVolume",
			volume, pv, self.setTerminatingVolumeStatus,
			storagev1alpha1.DestructionError,
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
	if config.BearerToken != "" {
		log.Info("using ServiceAccount bearer token")
		return salt.NewCredential(
			"storage-operator", config.BearerToken, salt.BearerToken,
		)
	} else if config.Username != "" && config.Password != "" {
		log.Info("using Basic HTTP authentication")
		creds := fmt.Sprintf("%s:%s", config.Username, config.Password)
		token := b64.StdEncoding.EncodeToString([]byte(creds))
		return salt.NewCredential(config.Username, token, salt.BasicToken)
	} else {
		log.Info("using default Basic HTTP authentication")
		token := b64.StdEncoding.EncodeToString([]byte("admin:admin"))
		return salt.NewCredential("admin", token, salt.BasicToken)
	}
}

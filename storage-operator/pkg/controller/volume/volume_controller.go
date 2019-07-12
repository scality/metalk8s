package volume

import (
	"context"

	storagev1alpha1 "github.com/scality/metalk8s/storage-operator/pkg/apis/storage/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	logf "sigs.k8s.io/controller-runtime/pkg/runtime/log"
	"sigs.k8s.io/controller-runtime/pkg/source"
)

var log = logf.Log.WithName("controller_volume")

// Add creates a new Volume Controller and adds it to the Manager. The Manager will set fields on the Controller
// and Start it when the Manager is Started.
func Add(mgr manager.Manager) error {
	return add(mgr, newReconciler(mgr))
}

// newReconciler returns a new reconcile.Reconciler
func newReconciler(mgr manager.Manager) reconcile.Reconciler {
	return &ReconcileVolume{client: mgr.GetClient(), scheme: mgr.GetScheme()}
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
	client client.Client
	scheme *runtime.Scheme
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
	reqLogger.Info("Reconciling Volume")

	// Fetch the Volume instance
	instance := &storagev1alpha1.Volume{}
	err := r.client.Get(context.TODO(), request.NamespacedName, instance)
	if err != nil {
		if errors.IsNotFound(err) {
			// Request object not found, could have been deleted after reconcile request.
			// Owned objects are automatically garbage collected. For additional cleanup logic use finalizers.
			// Return and don't requeue
			// TODO Remove the finalizer from the generated PV, if exists
			return reconcile.Result{}, nil
		}
		// Error reading the object - requeue the request.
		return reconcile.Result{}, err
	}

	pv := newPersistentVolumeForCR(instance)

	// Set Volume instance as the owner and controller
	if err := controllerutil.SetControllerReference(instance, pv, r.scheme); err != nil {
		return reconcile.Result{}, err
	}

	// Check if this PV already exists
	found := &corev1.PersistentVolume{}
	err = r.client.Get(context.TODO(), types.NamespacedName{Namespace: "", Name: pv.Name}, found)
	if err != nil && errors.IsNotFound(err) {
		reqLogger.Info("Creating a new PersistentVolume", "PersistentVolume.Name", pv.Name)
		err = r.client.Create(context.TODO(), pv)
		if err != nil {
			return reconcile.Result{}, err
		}

		// PV created successfully - don't requeue
		return reconcile.Result{}, nil
	} else if err != nil {
		return reconcile.Result{}, err
	}

	// PV already exists - don't requeue
	reqLogger.Info("Skip reconcile: PersistentVolume already exists", "PersistentVolume.Name", found.Name)

	return reconcile.Result{}, nil
}

func newPersistentVolumeForCR(cr *storagev1alpha1.Volume) *corev1.PersistentVolume {
	return &corev1.PersistentVolume{
		ObjectMeta: metav1.ObjectMeta{
			Name:   cr.Name,
			Labels: map[string]string{},
			Finalizers: []string{
				"storage.metalk8s.scality.com/volume-protection",
			},
		},
		Spec: corev1.PersistentVolumeSpec{
			AccessModes: []corev1.PersistentVolumeAccessMode{corev1.ReadWriteOnce},
			Capacity: map[corev1.ResourceName]resource.Quantity{
				corev1.ResourceStorage: resource.MustParse("1Gi"),
			},
			PersistentVolumeSource: corev1.PersistentVolumeSource{
				Local: &corev1.LocalVolumeSource{
					Path: "/tmp/foo",
				},
			},
			PersistentVolumeReclaimPolicy: "Retain",
			StorageClassName:              cr.Spec.StorageClassName,
			NodeAffinity:                  nodeAffinity(cr.Spec.NodeName),
		},
	}
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
				MatchFields: []corev1.NodeSelectorRequirement{
					{
						Key:      "metadata.name",
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

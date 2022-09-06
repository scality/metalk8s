package virtualippool

import (
	"context"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	metalk8sscalitycomv1alpha1 "github.com/scality/metalk8s/operator/api/v1alpha1"
	"github.com/scality/metalk8s/operator/pkg/controller/utils"
)

type VirtualIPPoolReconciler struct {
	client client.Client
	scheme *runtime.Scheme
}

var log = logf.Log.WithName("virtualippool-controller")

// Create a new VirtualIPPoolReconciler
func newVirtualIPPoolReconciler(mgr ctrl.Manager) *VirtualIPPoolReconciler {
	return &VirtualIPPoolReconciler{
		client: mgr.GetClient(),
		scheme: mgr.GetScheme(),
	}
}

// Add create the new Reconciler
func Add(mgr ctrl.Manager) error {
	reconciler := newVirtualIPPoolReconciler(mgr)

	return ctrl.NewControllerManagedBy(mgr).
		For(&metalk8sscalitycomv1alpha1.VirtualIPPool{}).
		Complete(reconciler)
}

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *VirtualIPPoolReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	reqLogger := log.WithValues("Request.Name", req.Name).WithValues("Request.Namespace", req.Namespace)
	reqLogger.Info("reconciling VirtualIPPool: START")
	defer reqLogger.Info("reconciling VirtualIPPool: STOP")

	instance := &metalk8sscalitycomv1alpha1.VirtualIPPool{}
	err := r.client.Get(ctx, req.NamespacedName, instance)
	if err != nil {
		if errors.IsNotFound(err) {
			// Nothing to do, all objects that should be deleted are
			// automatically grabage collected because of owner reference
			return utils.EndReconciliation()
		}
		return utils.Requeue(err)
	}

	// TODO(user): your logic here

	return utils.EndReconciliation()
}

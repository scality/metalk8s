package virtualip

import (
	"context"

	"github.com/go-logr/logr"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	metalk8sv1alpha1 "github.com/scality/metalk8s/operator/api/v1alpha1"
	"github.com/scality/metalk8s/operator/pkg/controller/utils"
)

type VirtualIPReconciler struct {
	utils.ObjectHandler
}

const (
	// Name of the component
	componentName = "metalk8s-vips"

	// Name of the namespace, managed by the operator, used to deploy Virtual IPs "stuff"
	namespaceName = "metalk8s-vips"
)

func NewReconciler(instance *metalk8sv1alpha1.ClusterConfig, client client.Client, scheme *runtime.Scheme, logger logr.Logger) *VirtualIPReconciler {
	return &VirtualIPReconciler{
		ObjectHandler: *utils.NewObjectHandler(
			instance,
			client,
			scheme,
			logger.WithName("virtualip-controller"),
			componentName,
		),
	}
}

func (r *VirtualIPReconciler) Reconcile(ctx context.Context) utils.ReconcilerResult {
	r.Logger.Info("reconciling VirtualIP setup: START")
	defer r.Logger.Info("reconciling VirtualIP setup: STOP")

	pools := r.Instance.Spec.WorkloadPlane.VirtualIPPools

	// Reconcile the VIP namespace
	namespaceInstance := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespaceName}}

	if len(pools) == 0 {
		// The namespace shouldn't exists
		changed, err := r.CreateOrUpdateOrDelete(ctx, nil, []client.Object{namespaceInstance}, nil)
		if err != nil {
			return utils.Requeue(err)
		}
		if changed {
			return utils.EndReconciliation()
		}
		return utils.NothingToDo()
	}

	// Create or update the namespace if needed
	// NOTE: We treat the namespace alone has nothing else can be created if this one
	// do not exists
	changed, err := r.CreateOrUpdateOrDelete(ctx, []client.Object{namespaceInstance}, nil, nil)
	if err != nil {
		return utils.Requeue(err)
	}
	if changed {
		return utils.EndReconciliation()
	}

	// TODO !

	return utils.NothingToDo()
}

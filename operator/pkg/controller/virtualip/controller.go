package virtualip

import (
	"context"

	"github.com/go-logr/logr"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	metalk8sv1alpha1 "github.com/scality/metalk8s/operator/api/v1alpha1"
	"github.com/scality/metalk8s/operator/pkg/controller/utils"
)

type VirtualIPReconciler struct {
	utils.ObjectHandler
}

const componentName = "metalk8s-vips"

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

	// TODO !

	return utils.NothingToDo()
}

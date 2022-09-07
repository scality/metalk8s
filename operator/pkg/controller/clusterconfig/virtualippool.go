package clusterconfig

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/go-logr/logr"
	metalk8sscalitycomv1alpha1 "github.com/scality/metalk8s/operator/api/v1alpha1"
	"github.com/scality/metalk8s/operator/pkg/controller/utils"
)

// Name of the namespace used for Virtual IPs
const vipNamespaceName = "metalk8s-vips"

func (r *ClusterConfigReconciler) reconcileVirtualIPPools(ctx context.Context, reqLogger logr.Logger) utils.SubReconcilerResult {
	logger := reqLogger.WithValues("SubReconciler", "VirtualIPPool")
	logger.Info("reconciling VIPs: START")
	defer logger.Info("reconciling VIPs: STOP")

	pools := r.instance.Spec.WorkloadPlane.VirtualIPPools

	handler := utils.NewObjectHandler(&r.instance, r.client, r.scheme, logger, componentName, appName)

	// Reconcile the VIP namespace
	namespaceInstance := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: vipNamespaceName}}

	if len(pools) == 0 {
		// The namespace shouldn't exists
		changed, err := handler.CreateOrUpdateOrDelete(ctx, nil, []client.Object{namespaceInstance}, nil)
		if err != nil {
			r.setVIPConfiguredCondition(
				metav1.ConditionFalse,
				"NamespaceDeletionError",
				err.Error(),
			)
			return utils.NeedRequeue(err)
		}
		if changed {
			r.setVIPConfiguredCondition(
				metav1.ConditionFalse,
				"NamespaceDeletionInProgress",
				fmt.Sprintf("No pools defined, deletion of the '%s' namespace in progress", vipNamespaceName),
			)
			return utils.NeedEndReconciliation()
		}

		r.setVIPConfiguredCondition(metav1.ConditionTrue, "NoPools", "Nothing to do, no pools defined")
		return utils.NothingToDo()
	}

	// Create or update the namespace if needed
	// NOTE: We treat the namespace alone has nothing else can be created if this one
	// do not exists
	changed, err := handler.CreateOrUpdateOrDelete(ctx, []client.Object{namespaceInstance}, nil, nil)
	if err != nil {
		r.setVIPConfiguredCondition(
			metav1.ConditionUnknown,
			"NamespaceUpdateError",
			err.Error(),
		)
		return utils.NeedRequeue(err)
	}
	if changed {
		r.setVIPConfiguredCondition(
			metav1.ConditionFalse,
			"NamespaceUpdateInProgress",
			fmt.Sprintf("Creation/Update of the '%s' namespace in progress", vipNamespaceName),
		)
		return utils.NeedEndReconciliation()
	}

	return utils.NothingToDo()
}

func (r *ClusterConfigReconciler) setVIPConfiguredCondition(status metav1.ConditionStatus, reason string, message string) {
	r.sendEvent(status, fmt.Sprintf("VirtualIPPool%s", reason), message)
	r.instance.SetVIPConfiguredCondition(status, reason, message)
}

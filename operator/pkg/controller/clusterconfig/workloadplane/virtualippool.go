package workloadplane

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/go-logr/logr"
	metalk8sscalitycomv1alpha1 "github.com/scality/metalk8s/operator/api/v1alpha1"
	"github.com/scality/metalk8s/operator/pkg/controller/utils"
)

type VirtualIPPoolReconciler struct {
	handler *utils.ObjectHandler
	logger  logr.Logger

	instance *metalk8sscalitycomv1alpha1.ClusterConfig
}

// Name of the namespace used for Virtual IPs
const vipNamespaceName = "metalk8s-vips"

// Load handler and instance in the struct
func (r *VirtualIPPoolReconciler) Load(handler *utils.ObjectHandler, logger logr.Logger, instance *metalk8sscalitycomv1alpha1.ClusterConfig) {
	r.handler = handler
	r.logger = logger
	r.instance = instance
}

func (r *VirtualIPPoolReconciler) GetLogger() logr.Logger {
	return r.logger
}

// Reconcile the WorkloadPlane Virtual IP Pools
func (r *VirtualIPPoolReconciler) Reconcile(ctx context.Context) utils.SubReconcilerResult {
	pools := r.instance.Spec.WorkloadPlane.VirtualIPPools

	// Reconcile the VIP namespace
	namespaceInstance := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: vipNamespaceName}}

	if len(pools) == 0 {
		// The namespace shouldn't exists
		changed, err := r.handler.CreateOrUpdateOrDelete(ctx, nil, []client.Object{namespaceInstance}, nil)
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
	changed, err := r.handler.CreateOrUpdateOrDelete(ctx, []client.Object{namespaceInstance}, nil, nil)
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

	// Retrieve all objects that should be created/updated
	objsToUpdate := []client.Object{}
	for name := range pools {
		objsToUpdate = append(objsToUpdate, &metalk8sscalitycomv1alpha1.VirtualIPPool{
			ObjectMeta: r.getPoolMeta(name),
		})
	}

	// Retrieve all objects that should be deleted
	objsToDelete := []client.Object{}
	poolList := metalk8sscalitycomv1alpha1.VirtualIPPoolList{}
	if err := r.handler.Client.List(ctx, &poolList, r.handler.GetMatchingLabels(false), client.InNamespace(vipNamespaceName)); err != nil {
		return utils.NeedRequeue(err)
	}
	for _, obj := range poolList.Items {
		if _, known := pools[obj.GetName()]; !known {
			objsToDelete = append(objsToDelete, &obj)
		}
	}

	changed, err = r.handler.CreateOrUpdateOrDelete(ctx, objsToUpdate, objsToDelete, r.mutateVIP)
	if err != nil {
		r.setVIPConfiguredCondition(
			metav1.ConditionUnknown,
			"ObjectUpdateError",
			err.Error(),
		)
		return utils.NeedRequeue(err)
	}
	if changed {
		r.setVIPConfiguredCondition(
			metav1.ConditionFalse,
			"ObjectUpdateInProgress",
			"Creation/Update of various objects in progress",
		)
		return utils.NeedEndReconciliation()
	}

	r.setVIPConfiguredCondition(metav1.ConditionTrue, "Configured", "All objects properly configured")

	// Wait for all VirtualIPPools to be Ready
	// NOTE: We only have one global status for the whole ClusterConfig
	// so we return on the first not ready pool
	for name := range pools {
		pool := &metalk8sscalitycomv1alpha1.VirtualIPPool{
			ObjectMeta: r.getPoolMeta(name),
		}
		if err := r.handler.Client.Get(ctx, client.ObjectKeyFromObject(pool), pool); err != nil {
			status := metav1.ConditionUnknown
			reason := "PoolRetrievingError"
			message := err.Error()
			if errors.IsNotFound(err) {
				status = metav1.ConditionFalse
				reason = "PoolNotCreated"
				message = fmt.Sprintf("The VirtualIPPool %s does not exist yet", pool.GetName())
				err = nil
			}
			r.setVIPReadyCondition(status, reason, message)
			return utils.NeedRequeue(err)
		}

		poolReady := pool.GetReadyCondition()

		// If ObservedGeneration do not match the Generation then we still need to wait
		if poolReady != nil && poolReady.ObservedGeneration != pool.Generation {
			r.setVIPReadyCondition(
				metav1.ConditionFalse,
				"PoolNotUpToDate",
				fmt.Sprintf("The latest changes on the VirtualIPPool %s are not yet applied", pool.GetName()),
			)
			return utils.NeedDelayedRequeue()
		}

		if poolReady != nil && poolReady.Status == metav1.ConditionTrue {
			// This pool is ready go next
			continue
		}

		status := metav1.ConditionUnknown
		reason := "PoolNotReady"
		message := fmt.Sprintf("The VirtualIPPool %s is not yet Ready", pool.GetName())
		if poolReady != nil {
			status = poolReady.Status
			message += fmt.Sprintf(
				": Reason: %s, Message: %s",
				poolReady.Reason, poolReady.Message,
			)
		}
		r.setVIPReadyCondition(status, reason, message)
		return utils.NeedDelayedRequeue()
	}

	r.setVIPReadyCondition(metav1.ConditionTrue, "Ready", "All Pools are Ready")

	return utils.NothingToDo()
}

func (r *VirtualIPPoolReconciler) setVIPConfiguredCondition(status metav1.ConditionStatus, reason string, message string) {
	r.handler.SendEvent(status, fmt.Sprintf("WorkloadPlaneVirtualIPPool%s", reason), message)
	r.instance.SetWPVIPConfiguredCondition(status, reason, message)
}

func (r *VirtualIPPoolReconciler) setVIPReadyCondition(status metav1.ConditionStatus, reason string, message string) {
	r.handler.SendEvent(status, fmt.Sprintf("WorkloadPlaneVirtualIPPool%s", reason), message)
	r.instance.SetWPVIPReadyCondition(status, reason, message)
}

func (r *VirtualIPPoolReconciler) getPoolMeta(name string) metav1.ObjectMeta {
	return metav1.ObjectMeta{
		Name:      name,
		Namespace: vipNamespaceName,
	}
}

func (r *VirtualIPPoolReconciler) mutateVIP(obj client.Object) error {
	pool := obj.(*metalk8sscalitycomv1alpha1.VirtualIPPool)

	pool.Spec = r.instance.Spec.WorkloadPlane.VirtualIPPools[pool.GetName()]

	if pool.Spec.Healthcheck == nil {
		pool.Spec.Healthcheck = &metalk8sscalitycomv1alpha1.HealthcheckSpec{
			HttpGet: metalk8sscalitycomv1alpha1.HttpGetSpec{
				Scheme: "HTTPS",
				IP:     "127.0.0.1",
				Port:   443,
				Path:   "/healthz",
			},
		}
	}

	return nil
}

package controlplane

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

type IngressReconciler struct {
	handler *utils.ObjectHandler
	logger  logr.Logger

	instance *metalk8sscalitycomv1alpha1.ClusterConfig
}

const (
	// Name of the namespace used for the Ingress
	namespaceName = "metalk8s-ingress"

	// Name of the Pool to manage the VIP (if needed)
	poolName = "ingress-control-plane-managed-vip"
)

// Load handler and instance in the struct
func (r *IngressReconciler) Load(handler *utils.ObjectHandler, logger logr.Logger, instance *metalk8sscalitycomv1alpha1.ClusterConfig) {
	r.handler = handler
	r.logger = logger
	r.instance = instance
}

func (r *IngressReconciler) GetLogger() logr.Logger {
	return r.logger
}

// Reconcile the Control Plane Ingress
func (r *IngressReconciler) Reconcile(ctx context.Context) utils.SubReconcilerResult {
	// Reconcile the Ingress namespace
	namespaceInstance := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespaceName}}

	// Create or update the namespace if needed
	// NOTE: We treat the namespace alone has nothing else can be created if this one
	// do not exist
	// Since the namespace is used by the Workload Plane Ingress as well
	// we do not manage it entirely, just ensure that it exist
	err := r.handler.Client.Create(ctx, namespaceInstance)
	if err != nil && !errors.IsAlreadyExists(err) {
		r.setConfiguredCondition(
			metav1.ConditionUnknown,
			"NamespaceCreationError",
			err.Error(),
		)
		return utils.NeedRequeue(err)
	}

	info := r.getInfo()

	// Retrieve all objects that should be created/updated/deleted
	objsToUpdate := []client.Object{}
	objsToDelete := []client.Object{}

	vipPool := &metalk8sscalitycomv1alpha1.VirtualIPPool{
		ObjectMeta: metav1.ObjectMeta{
			Name:      poolName,
			Namespace: namespaceName,
		},
	}
	vipAction := ""
	if info.ManagedVirtualIP != nil {
		objsToUpdate = append(objsToUpdate, vipPool)
		vipAction = "Creation/Update"
	} else {
		objsToDelete = append(objsToDelete, vipPool)
		vipAction = "Deletion"
	}

	changed, err := r.handler.CreateOrUpdateOrDelete(ctx, objsToUpdate, objsToDelete, r.mutateVIP)
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
			fmt.Sprintf("%s of various objects in progress", vipAction),
		)
		return utils.NeedEndReconciliation()
	}

	if info.ManagedVirtualIP != nil {
		r.setVIPConfiguredCondition(metav1.ConditionTrue, "Configured", "All objects properly configured")
	} else {
		r.setVIPConfiguredCondition(metav1.ConditionFalse, "NoVIP", "Nothing to do, no Virtual IP to setup")
		r.setVIPReadyCondition(metav1.ConditionFalse, "NoVIP", "Nothing to do, no Virtual IP to setup")
	}

	// Wait for the VIP to be Ready if needed
	if info.ManagedVirtualIP != nil {
		if err := r.handler.Client.Get(ctx, client.ObjectKeyFromObject(vipPool), vipPool); err != nil {
			status := metav1.ConditionUnknown
			reason := "PoolRetrievingError"
			message := err.Error()
			if errors.IsNotFound(err) {
				status = metav1.ConditionFalse
				reason = "PoolNotCreated"
				message = fmt.Sprintf("The VirtualIPPool %s does not exist yet", vipPool.GetName())
				err = nil
			}
			r.setVIPReadyCondition(status, reason, message)
			return utils.NeedRequeue(err)
		}

		poolReady := vipPool.GetReadyCondition()

		// If ObservedGeneration do not match the Generation then we still need to wait
		if poolReady != nil && poolReady.ObservedGeneration != vipPool.Generation {
			r.setVIPReadyCondition(
				metav1.ConditionFalse,
				"PoolNotUpToDate",
				fmt.Sprintf("The latest changes on the VirtualIPPool %s are not yet applied", vipPool.GetName()),
			)
			return utils.NeedDelayedRequeue()
		}

		if poolReady == nil || poolReady.Status != metav1.ConditionTrue {
			// The pool is not yet ready
			status := metav1.ConditionUnknown
			reason := "PoolNotReady"
			message := fmt.Sprintf("The VirtualIPPool %s is not yet Ready", vipPool.GetName())
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

		r.setVIPReadyCondition(metav1.ConditionTrue, "Ready", "The Control Plane Ingress Virtual IP is Ready")
	}

	// TODO: Handle here Ingress deployment/update

	// Report the Ingress IP and endpoint
	var ingressIP metalk8sscalitycomv1alpha1.IPAddress
	if info.ManagedVirtualIP != nil {
		ingressIP = info.ManagedVirtualIP.Address
	} else if info.ExternalIP != nil {
		ingressIP = info.ExternalIP.Address
	} else {
		// Fallback on the bootstrap node IP
		var nodeList corev1.NodeList
		if err := r.handler.Client.List(ctx, &nodeList, client.MatchingLabels{"node-role.kubernetes.io/bootstrap": ""}); err != nil {
			return utils.NeedRequeue(err)
		}

		// Error if there is multiple or no Bootstrap node
		if len(nodeList.Items) != 1 {
			message := fmt.Sprintf("Unable to found a single Bootstrap node got %d", len(nodeList.Items))
			r.setConfiguredCondition(
				metav1.ConditionUnknown,
				"BootstrapRetrievingError",
				message,
			)
			return utils.NeedRequeue(fmt.Errorf(message))
		}

		for _, addr := range nodeList.Items[0].Status.Addresses {
			if addr.Type == corev1.NodeInternalIP {
				ingressIP = metalk8sscalitycomv1alpha1.IPAddress(addr.Address)
				break
			}
		}

		if ingressIP == "" {
			message := fmt.Sprintf("Unable to find %s node IP", nodeList.Items[0].GetName())
			r.setConfiguredCondition(
				metav1.ConditionUnknown,
				"BootstrapIPRetrievingError",
				message,
			)
			return utils.NeedRequeue(fmt.Errorf(message))
		}
	}
	r.instance.Status.ControlPlane.Ingress.IP = ingressIP
	r.instance.Status.ControlPlane.Ingress.Endpoint = fmt.Sprintf("https://%s:8443", ingressIP)

	r.setConfiguredCondition(metav1.ConditionTrue, "Configured", "All objects properly configured")

	return utils.NothingToDo()
}

func (r *IngressReconciler) getInfo() metalk8sscalitycomv1alpha1.ControlPlaneIngressSpec {
	return r.instance.Spec.ControlPlane.Ingress
}

func (r *IngressReconciler) setConfiguredCondition(status metav1.ConditionStatus, reason string, message string) {
	r.handler.SendEvent(status, fmt.Sprintf("ControlPlaneIngress%s", reason), message)
	r.instance.SetCPIngressConfiguredCondition(status, reason, message)
}

func (r *IngressReconciler) setVIPConfiguredCondition(status metav1.ConditionStatus, reason string, message string) {
	r.handler.SendEvent(status, fmt.Sprintf("ControlPlaneIngressVirtualIP%s", reason), message)
	r.instance.SetCPIngressVIPConfiguredCondition(status, reason, message)
}

func (r *IngressReconciler) setVIPReadyCondition(status metav1.ConditionStatus, reason string, message string) {
	r.handler.SendEvent(status, fmt.Sprintf("ControlPlaneIngressVirtualIP%s", reason), message)
	r.instance.SetCPIngressVIPReadyCondition(status, reason, message)
}

func (r *IngressReconciler) mutateVIP(obj client.Object) error {
	pool := obj.(*metalk8sscalitycomv1alpha1.VirtualIPPool)

	pool.Spec = metalk8sscalitycomv1alpha1.VirtualIPPoolSpec{
		Addresses:    []metalk8sscalitycomv1alpha1.IPAddress{r.getInfo().ManagedVirtualIP.Address},
		NodeSelector: map[string]string{"node-role.kubernetes.io/master": ""},
		Tolerations: []corev1.Toleration{
			{
				Key:      "node-role.kubernetes.io/bootstrap",
				Effect:   corev1.TaintEffectNoSchedule,
				Operator: corev1.TolerationOpExists,
			}, {
				Key:      "node-role.kubernetes.io/master",
				Effect:   corev1.TaintEffectNoSchedule,
				Operator: corev1.TolerationOpExists,
			}, {
				Key:      "node-role.kubernetes.io/infra",
				Effect:   corev1.TaintEffectNoSchedule,
				Operator: corev1.TolerationOpExists,
			},
		},
		Healthcheck: &metalk8sscalitycomv1alpha1.HealthcheckSpec{
			HttpGet: metalk8sscalitycomv1alpha1.HttpGetSpec{
				Scheme: "HTTPS",
				Port:   8443,
			},
		},
	}

	return nil
}

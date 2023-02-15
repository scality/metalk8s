package virtualippool

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	metalk8sscalitycomv1alpha1 "github.com/scality/metalk8s/operator/api/v1alpha1"
	"github.com/scality/metalk8s/operator/pkg/controller/utils"
)

type VirtualIPPoolReconciler struct {
	client   client.Client
	scheme   *runtime.Scheme
	recorder record.EventRecorder

	handler  *utils.ObjectHandler
	instance metalk8sscalitycomv1alpha1.VirtualIPPool
	// Some cache to ensure we don't reuse Virtual Router IDs, even for different pools
	usedVRID       map[int]bool
	nodeList       corev1.NodeList
	configChecksum string
}

const (
	// Name of the controller
	controllerName = "virtualippool-controller"

	// Name of the component
	componentName = "metalk8s-vips"

	// Name of the application
	appName = "virtualippool"

	// Annotation key to store Config checksum
	annotationChecksumName = "checksum/config"

	// ConfigMap key for HL config
	hlConfigMapKey = "hl-config.yaml"
)

var log = logf.Log.WithName(controllerName)

// Create a new VirtualIPPoolReconciler
func newVirtualIPPoolReconciler(mgr ctrl.Manager) *VirtualIPPoolReconciler {
	return &VirtualIPPoolReconciler{
		client:   mgr.GetClient(),
		scheme:   mgr.GetScheme(),
		recorder: mgr.GetEventRecorderFor(controllerName),
	}
}

// Add create the new Reconciler
func Add(mgr ctrl.Manager) error {
	reconciler := newVirtualIPPoolReconciler(mgr)

	return ctrl.NewControllerManagedBy(mgr).
		For(&metalk8sscalitycomv1alpha1.VirtualIPPool{}).
		Owns(&corev1.ConfigMap{}).
		Owns(&appsv1.DaemonSet{}).
		Complete(reconciler)
}

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *VirtualIPPoolReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	reqLogger := log.WithValues("Request.Name", req.Name).WithValues("Request.Namespace", req.Namespace)
	reqLogger.Info("reconciling VirtualIPPool: START")
	defer reqLogger.Info("reconciling VirtualIPPool: STOP")

	err := r.client.Get(ctx, req.NamespacedName, &r.instance)
	if err != nil {
		if errors.IsNotFound(err) {
			// Nothing to do, all objects that should be deleted are
			// automatically grabage collected because of owner reference
			return utils.EndReconciliation()
		}
		return utils.Requeue(err)
	}

	// Retrieve all nodes
	if err := r.client.List(ctx, &r.nodeList); err != nil {
		return utils.Requeue(err)
	}

	// Retrieve all configured Virtual Router IDs
	r.usedVRID = make(map[int]bool, 255)
	pools := metalk8sscalitycomv1alpha1.VirtualIPPoolList{}
	if err := r.client.List(ctx, &pools); err != nil {
		return utils.Requeue(err)
	}
	for _, pool := range pools.Items {
		if err := r.cacheUsedVRIDs(ctx, pool); err != nil {
			return utils.Requeue(err)
		}
	}

	// We consider all objects has "to be updated" then the `CreateOrUpdate` function
	// will see (using the mutate function) if those object actually need updates or not
	objsToUpdate := []client.Object{
		r.instance.GetConfigMap(),
		r.instance.GetDaemonSet(),
	}

	r.handler = utils.NewObjectHandler(&r.instance, r.client, r.scheme, r.recorder, reqLogger, componentName, appName)

	// Starting here some change might be done on the cluster, so make sure to publish status update
	defer r.client.Status().Update(ctx, &r.instance)

	changed, err := r.handler.CreateOrUpdateOrDelete(ctx, objsToUpdate, nil, r.mutate)
	if err != nil {
		r.setConfiguredCondition(
			metav1.ConditionUnknown,
			"ObjectUpdateError",
			err.Error(),
		)
		return utils.Requeue(err)
	}
	if changed {
		r.setConfiguredCondition(
			metav1.ConditionFalse,
			"ObjectUpdateInProgress",
			"Creation/Update of various objects in progress",
		)
		return utils.EndReconciliation()
	}

	r.setConfiguredCondition(metav1.ConditionTrue, "Configured", "All objects properly configured")

	// Wait for DaemonSet replicas to be Ready
	ds := r.instance.GetDaemonSet()
	if err := r.client.Get(ctx, client.ObjectKeyFromObject(ds), ds); err != nil {
		status := metav1.ConditionUnknown
		reason := "DaemonSetRetrievingError"
		message := err.Error()
		if errors.IsNotFound(err) {
			status = metav1.ConditionFalse
			reason = "DaemonSetNotCreated"
			message = "The DaemonSet does not exist yet"
			err = nil
		}
		r.setAvailableCondition(status, reason, message)
		r.setReadyCondition(status, reason, message)
		return utils.Requeue(err)
	}

	// If ObservedGeneration do not match the Generation then we still need to wait
	if ds.Status.ObservedGeneration != ds.Generation {
		reason := "DaemonSetNotUpToDate"
		message := "The latest changes on the DaemonSet are not yet applied"
		r.setAvailableCondition(metav1.ConditionFalse, reason, message)
		r.setReadyCondition(metav1.ConditionFalse, reason, message)
		return utils.DelayedRequeue()
	}

	desired := ds.Status.DesiredNumberScheduled
	available := ds.Status.NumberAvailable

	// If all Pods are Available then the VirtualIPPool is Ready and Available
	if desired == available {
		message := fmt.Sprintf("All %d replicas are Available", available)
		r.setAvailableCondition(metav1.ConditionTrue, "Available", message)
		r.setReadyCondition(metav1.ConditionTrue, "Ready", message)
		return utils.EndReconciliation()
	}

	// If we have at least one Pod ready we consider the VirtualIPPool as Available
	if ds.Status.NumberReady > 0 {
		r.setAvailableCondition(metav1.ConditionTrue, "Available", fmt.Sprintf("%d replicas are Available", available))
		r.setReadyCondition(metav1.ConditionFalse, "NotReady", fmt.Sprintf("All the replicas are not yet Available, %d/%d Available", available, desired))
	} else {
		reason := "No replicas Available yet"
		r.setAvailableCondition(metav1.ConditionFalse, "NotAvailable", reason)
		r.setAvailableCondition(metav1.ConditionFalse, "NotReady", reason)
	}

	return utils.DelayedRequeue()
}

func (r *VirtualIPPoolReconciler) setConfiguredCondition(status metav1.ConditionStatus, reason string, message string) {
	r.handler.SendEvent(status, reason, message)
	r.instance.SetConfiguredCondition(status, reason, message)
}

func (r *VirtualIPPoolReconciler) setAvailableCondition(status metav1.ConditionStatus, reason string, message string) {
	r.handler.SendEvent(status, reason, message)
	r.instance.SetAvailableCondition(status, reason, message)
}

func (r *VirtualIPPoolReconciler) setReadyCondition(status metav1.ConditionStatus, reason string, message string) {
	r.handler.SendEvent(status, reason, message)
	r.instance.SetReadyCondition(status, reason, message)
}

// Retrieve the currently configured VRIDs and cache them to `usedVRID` in order to
// not set the same Virtual Router ID for 2 different Virtual IP
func (r *VirtualIPPoolReconciler) cacheUsedVRIDs(ctx context.Context, pool metalk8sscalitycomv1alpha1.VirtualIPPool) error {
	configMap := pool.GetConfigMap()
	if err := r.client.Get(ctx, client.ObjectKeyFromObject(configMap), configMap); err != nil {
		if errors.IsNotFound(err) {
			return nil
		}
		return err
	}
	config := &HLConfig{}
	if content, ok := configMap.Data[hlConfigMapKey]; ok {
		if err := config.Load(content); err != nil {
			return err
		}
	}

	for _, addr := range config.Addresses {
		// Mark the Virtual Router ID as Used
		r.usedVRID[addr.VrId] = true
	}

	return nil
}

// Return a not used Virtual Router ID and mark it as used
func (r *VirtualIPPoolReconciler) getFreeVRID() int {
	for i := 1; i <= 255; i++ {
		if !r.usedVRID[i] {
			r.usedVRID[i] = true
			return i
		}
	}
	// There is no more Virtual Router ID free
	return -1
}

// Return the list of Nodes where a pool should be deployed and
// number of time the node should be used
// We return a map of node name and number of IPs minimum per node
// And the number of extra IPs that can be defined (can not have more than one per node)
func (r *VirtualIPPoolReconciler) getNodeList() (map[string]int, int) {
	nodes := map[string]int{}

	selector := labels.SelectorFromSet(r.instance.Spec.NodeSelector)
	for _, node := range r.nodeList.Items {
		if selector.Matches(labels.Set(node.GetLabels())) {
			nodes[node.GetName()] = 0
		}
	}

	// TODO: Handle Spread constraints

	if len(nodes) == 0 {
		return nodes, 0
	}

	// Spread the IPs on every nodes
	// Set the number of IPs that should sit on every nodes
	// The last IPs may sit on any of those nodes
	min_number := len(r.instance.Spec.Addresses) / len(nodes)
	extra := len(r.instance.Spec.Addresses) % len(nodes)
	for node := range nodes {
		nodes[node] = min_number
	}

	return nodes, extra
}

func (r *VirtualIPPoolReconciler) mutate(obj client.Object) error {
	switch obj.(type) {
	case *corev1.ConfigMap:
		return r.mutateConfigMap(obj.(*corev1.ConfigMap))
	case *appsv1.DaemonSet:
		return r.mutateDaemonSet(obj.(*appsv1.DaemonSet))
	default:
		return nil
	}
}

func (r *VirtualIPPoolReconciler) mutateConfigMap(obj *corev1.ConfigMap) error {
	nodes, extra := r.getNodeList()

	current := &HLConfig{}
	if content, ok := obj.Data[hlConfigMapKey]; ok {
		if err := current.Load(content); err != nil {
			return err
		}
	}

	desired := &HLConfig{}
	desired.Init()
	for _, ip := range r.instance.Spec.Addresses {
		addr := current.GetAddr(string(ip))
		if addr == nil {
			addr = &VIPAddress{
				IP:   string(ip),
				VrId: r.getFreeVRID(),
			}
			if addr.VrId == -1 {
				return fmt.Errorf(
					"unable to find any free Virtual Router ID for '%s' in pool '%s' in namespace '%s'",
					ip, r.instance.GetName(), r.instance.GetNamespace(),
				)
			}
		}
		if addr.Node != "" {
			// The node is already defined
			if nodes[addr.Node] == 0 && extra > 0 {
				// Add one of the "extra" IPs on this node
				nodes[addr.Node]--
				extra--
			} else if nodes[addr.Node] < 0 {
				// This node already have the max number of IPs define
				addr.Node = ""
			} else {
				nodes[addr.Node]--
			}
		}

		desired.Addresses = append(desired.Addresses, *addr)
	}

	// Spread the remaining nodes
	for index := range desired.Addresses {
		if desired.Addresses[index].Node == "" {
			for node := range nodes {
				if nodes[node] > 0 {
					// There is some IPs on this node that need to be set
					desired.Addresses[index].Node = node
					nodes[node]--
					break
				} else if nodes[node] == 0 && extra > 0 {
					// Some extra IPs remaining and this node do not have any "extra"
					// IPs yet so add one
					desired.Addresses[index].Node = node
					nodes[node]--
					extra--
					break
				}
				// This node already have the max number of IPs define
			}
		}
	}

	content, err := desired.ToYaml()
	if err != nil {
		return err
	}
	if obj.Data == nil {
		obj.Data = make(map[string]string)
	}
	obj.Data[hlConfigMapKey] = content

	// Store Config checksum
	checksum := sha256.Sum256([]byte(content))
	r.configChecksum = hex.EncodeToString(checksum[:])

	return nil
}

func (r *VirtualIPPoolReconciler) mutateDaemonSet(obj *appsv1.DaemonSet) error {
	obj.Spec.Template.Spec.NodeSelector = r.instance.Spec.NodeSelector
	obj.Spec.Template.Spec.Tolerations = r.instance.Spec.Tolerations

	utils.UpdateAnnotations(
		&obj.Spec.Template.ObjectMeta,
		map[string]string{annotationChecksumName: r.configChecksum},
	)

	obj.Spec.Template.Spec.HostNetwork = true

	volumeName := "hl-config"
	defaultMode := int32(420)
	obj.Spec.Template.Spec.Volumes = []corev1.Volume{
		{
			Name: volumeName,
			VolumeSource: corev1.VolumeSource{
				ConfigMap: &corev1.ConfigMapVolumeSource{
					LocalObjectReference: corev1.LocalObjectReference{
						Name: r.instance.GetConfigMap().GetName(),
					},
					DefaultMode: &defaultMode,
				},
			},
		},
	}

	// If we have more than 1 container we clean up the containers list
	if len(obj.Spec.Template.Spec.Containers) != 1 {
		obj.Spec.Template.Spec.Containers = []corev1.Container{{}}
	}
	container := &obj.Spec.Template.Spec.Containers[0]

	container.Name = "keepalived"
	container.Image = utils.GetImageName("metalk8s-keepalived")
	container.Env = []corev1.EnvVar{
		{
			Name: "NODE_NAME",
			ValueFrom: &corev1.EnvVarSource{
				FieldRef: &corev1.ObjectFieldSelector{
					APIVersion: "v1",
					FieldPath:  "spec.nodeName",
				},
			},
		},
	}
	container.VolumeMounts = []corev1.VolumeMount{
		{
			Name:      volumeName,
			MountPath: "/etc/keepalived/keepalived-input.yaml",
			SubPath:   hlConfigMapKey,
		},
	}
	container.SecurityContext = &corev1.SecurityContext{
		Capabilities: &corev1.Capabilities{
			Drop: []corev1.Capability{
				"ALL",
			},
			Add: []corev1.Capability{
				"NET_ADMIN",
				"NET_BIND_SERVICE",
				"NET_RAW",
				"SETUID",
				"SETGID",
				"NET_BROADCAST",
			},
		},
	}

	return nil
}

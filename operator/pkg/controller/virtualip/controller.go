package virtualip

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"

	"github.com/go-logr/logr"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	metalk8sv1alpha1 "github.com/scality/metalk8s/operator/api/v1alpha1"
	"github.com/scality/metalk8s/operator/pkg/controller/utils"
)

type VirtualIPReconciler struct {
	utils.ObjectHandler

	// Some cache to ensure we don't reuse Virtual Router IDs, even for different pools
	usedVRID map[int]bool
	nodeList corev1.NodeList

	configChecksum map[string]string
}

const (
	// Name of the component
	componentName = "metalk8s-vips"

	// Name of the namespace, managed by the operator, used to deploy Virtual IPs "stuff"
	namespaceName = "metalk8s-vips"

	// Label key to store the pool name
	labelPoolName = "metalk8s.scality.com/pool.name"

	// Annotation key to store Config checksum
	annotationChecksumName = "checksum/config"

	// ConfigMap key for HL config
	hlConfigMapKey = "hl-config.yaml"

	// Name of the conditions we set in the object status
	configuredConditionName = "VirtualIPsConfigured"
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
		usedVRID:       make(map[int]bool, 255),
		configChecksum: make(map[string]string),
	}
}

func (r *VirtualIPReconciler) Reconcile(ctx context.Context) utils.ReconcilerResult {
	r.Logger.Info("reconciling VirtualIP setup: START")
	defer r.Logger.Info("reconciling VirtualIP setup: STOP")

	pools := r.getPools()

	// Reconcile the VIP namespace
	namespaceInstance := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: namespaceName}}

	if len(pools) == 0 {
		// The namespace shouldn't exists
		changed, err := r.CreateOrUpdateOrDelete(ctx, nil, []client.Object{namespaceInstance}, nil)
		if err != nil {
			r.updateCondition(
				metav1.ConditionFalse,
				"NamespaceDeletionError",
				err.Error(),
			)
			return utils.Requeue(err)
		}
		if changed {
			r.updateCondition(
				metav1.ConditionFalse,
				"NamespaceDeletionInProgress",
				fmt.Sprintf("No pools defined, deletion of the '%s' namespace in progress", namespaceName),
			)
			return utils.EndReconciliation()
		}

		r.updateCondition(metav1.ConditionTrue, "NoPools", "Nothing to do, no pools defined")
		return utils.NothingToDo()
	}

	// Create or update the namespace if needed
	// NOTE: We treat the namespace alone has nothing else can be created if this one
	// do not exists
	changed, err := r.CreateOrUpdateOrDelete(ctx, []client.Object{namespaceInstance}, nil, nil)
	if err != nil {
		r.updateCondition(
			metav1.ConditionUnknown,
			"NamespaceUpdateError",
			err.Error(),
		)
		return utils.Requeue(err)
	}
	if changed {
		r.updateCondition(
			metav1.ConditionFalse,
			"NamespaceUpdateInProgress",
			fmt.Sprintf("Creation/Update of the '%s' namespace in progress", namespaceName),
		)
		return utils.EndReconciliation()
	}

	// Retrieve all nodes
	if err := r.Client.List(ctx, &r.nodeList); err != nil {
		r.updateCondition(
			metav1.ConditionUnknown,
			"NodeRetrievingError",
			err.Error(),
		)
		return utils.Requeue(err)
	}

	objsToDelete := []client.Object{}
	objsToUpdate := []client.Object{}

	poolsNames := []string{}

	for pName := range pools {
		// We consider all pool has "to be updated" then the `CreateOrUpdate` function
		// will see (using the mutate function) if those object actually needed updates or not
		objMeta := metav1.ObjectMeta{
			Name:      r.getObjName(pName),
			Namespace: namespaceName,
			Labels: map[string]string{
				labelPoolName: pName,
			},
		}
		objsToUpdate = append(objsToUpdate, &corev1.ConfigMap{ObjectMeta: objMeta})
		objsToUpdate = append(objsToUpdate, &appsv1.DaemonSet{ObjectMeta: objMeta})

		r.retrieveVRID(ctx, client.ObjectKey{Name: objMeta.Name, Namespace: objMeta.Namespace})

		poolsNames = append(poolsNames, pName)
	}

	// Retrieve all objects that should be deleted
	selector, err := metav1.LabelSelectorAsSelector(&metav1.LabelSelector{
		MatchExpressions: []metav1.LabelSelectorRequirement{
			{
				Key:      labelPoolName,
				Operator: metav1.LabelSelectorOpNotIn,
				Values:   poolsNames,
			},
		},
		MatchLabels: r.GetMatchingLabels(false),
	})

	if err != nil {
		r.updateCondition(
			metav1.ConditionUnknown,
			"NodeLabelSelectorCreationError",
			err.Error(),
		)
		return utils.Requeue(err)
	}
	listOpt := client.ListOptions{
		LabelSelector: selector,
		Namespace:     namespaceName,
	}

	configMapList := corev1.ConfigMapList{}
	if err := r.Client.List(ctx, &configMapList, &listOpt); err != nil {
		r.updateCondition(
			metav1.ConditionUnknown,
			"ConfigMapRetrievingError",
			err.Error(),
		)
		return utils.Requeue(err)
	}
	for _, obj := range configMapList.Items {
		objsToDelete = append(objsToDelete, &obj)
	}
	daemonSetList := appsv1.DaemonSetList{}
	if err := r.Client.List(ctx, &daemonSetList, &listOpt); err != nil {
		r.updateCondition(
			metav1.ConditionUnknown,
			"DaemonSetRetrievingError",
			err.Error(),
		)
		return utils.Requeue(err)
	}
	for _, obj := range daemonSetList.Items {
		objsToDelete = append(objsToDelete, &obj)
	}

	changed, err = r.CreateOrUpdateOrDelete(ctx, objsToUpdate, objsToDelete, r.mutate)
	if err != nil {
		r.updateCondition(
			metav1.ConditionUnknown,
			"ObjectUpdateError",
			err.Error(),
		)
		return utils.Requeue(err)
	}
	if changed {
		r.updateCondition(
			metav1.ConditionFalse,
			"ObjectUpdateInProgress",
			"Creation/Update of various objects in progress",
		)
		return utils.EndReconciliation()
	}

	// TODO: Reconfigure CNI + re-generate the Ingress server certificate

	r.updateCondition(metav1.ConditionTrue, "Configured", "All objects properly configured")
	return utils.NothingToDo()
}

func (r *VirtualIPReconciler) updateCondition(status metav1.ConditionStatus, reason string, message string) {
	r.Instance.SetCondition(configuredConditionName, status, reason, message)
}

func (r *VirtualIPReconciler) getPools() map[string]metalk8sv1alpha1.VirtualIPPoolSpec {
	return r.Instance.Spec.WorkloadPlane.VirtualIPPools
}

func (r *VirtualIPReconciler) getObjName(poolName string) string {
	return fmt.Sprintf("metalk8s-vips-wp-%s", poolName)
}

func (r *VirtualIPReconciler) retrieveVRID(ctx context.Context, key client.ObjectKey) error {
	configMap := corev1.ConfigMap{}
	if err := r.Client.Get(ctx, key, &configMap); err != nil {
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
func (r *VirtualIPReconciler) getFreeVRID() int {
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
func (r *VirtualIPReconciler) getNodeList(pool string) map[string]int {
	nodes := map[string]int{}
	poolInfo := r.getPools()[pool]

	selector := labels.SelectorFromSet(poolInfo.NodeSelector)
	for _, node := range r.nodeList.Items {
		if selector.Matches(labels.Set(node.GetLabels())) {
			nodes[node.GetName()] = 0
		}
	}

	// TODO: Handle Spread constraints

	if len(nodes) == 0 {
		return nodes
	}

	// Spread the IPs on every nodes
	// NOTE: We take the "Ceil" since, in case where we have a number of
	// IPs that is not a multiple of nodes, the last IPs may sit on any of
	// those nodes
	number := math.Ceil(float64(len(poolInfo.Addresses)) / float64(len(nodes)))
	for node := range nodes {
		nodes[node] = int(number)
	}

	return nodes
}

func (r *VirtualIPReconciler) mutate(obj client.Object) error {
	switch obj.(type) {
	case *corev1.ConfigMap:
		return r.mutateConfigMap(obj.(*corev1.ConfigMap))
	case *appsv1.DaemonSet:
		return r.mutateDaemonSet(obj.(*appsv1.DaemonSet))
	default:
		return nil
	}
}

func (r *VirtualIPReconciler) mutateConfigMap(obj *corev1.ConfigMap) error {
	poolName := obj.GetLabels()[labelPoolName]
	poolInfo := r.getPools()[poolName]
	nodes := r.getNodeList(poolName)

	current := &HLConfig{}
	if content, ok := obj.Data[hlConfigMapKey]; ok {
		if err := current.Load(content); err != nil {
			return err
		}
	}

	desired := &HLConfig{}
	desired.Init()
	for _, ip := range poolInfo.Addresses {
		addr := current.GetAddr(string(ip))
		if addr == nil {
			addr = &VIPAddress{
				IP:   string(ip),
				VrId: r.getFreeVRID(),
			}
			if addr.VrId == -1 {
				return fmt.Errorf(
					"unable to find any free Virtual Router ID for '%s' in pool '%s'",
					ip, poolName,
				)
			}
		}
		if addr.Node != "" {
			// The node is already defined
			if nodes[addr.Node] == 0 {
				// This node is not available, remove it
				addr.Node = ""
			} else {
				nodes[addr.Node]--
			}
		}

		desired.Addresses = append(desired.Addresses, *addr)
	}

	// Spread the remaining nodes
	for node, nb := range nodes {
		for i := 0; i < nb; i++ {
			for index := range desired.Addresses {
				if desired.Addresses[index].Node == "" {
					desired.Addresses[index].Node = node
					break
				}
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
	r.configChecksum[poolName] = hex.EncodeToString(checksum[:])

	return nil
}

func (r *VirtualIPReconciler) mutateDaemonSet(obj *appsv1.DaemonSet) error {
	poolName := obj.GetLabels()[labelPoolName]
	poolInfo := r.getPools()[poolName]

	selector := make(client.MatchingLabels)
	selector[labelPoolName] = poolName

	obj.Spec.Selector = &metav1.LabelSelector{
		MatchLabels: selector,
	}
	utils.UpdateLabels(&obj.Spec.Template.ObjectMeta, selector)

	obj.Spec.Template.Spec.NodeSelector = poolInfo.NodeSelector

	utils.UpdateAnnotations(
		&obj.Spec.Template.ObjectMeta,
		map[string]string{annotationChecksumName: r.configChecksum[poolName]},
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
						Name: r.getObjName(poolName),
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

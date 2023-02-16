package clusterconfig

import (
	"context"
	"fmt"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	metalk8sscalitycomv1alpha1 "github.com/scality/metalk8s/operator/api/v1alpha1"
	"github.com/scality/metalk8s/operator/pkg/controller/clusterconfig/controlplane"
	"github.com/scality/metalk8s/operator/pkg/controller/clusterconfig/workloadplane"
	"github.com/scality/metalk8s/operator/pkg/controller/utils"
)

type ClusterConfigReconciler struct {
	client   client.Client
	scheme   *runtime.Scheme
	recorder record.EventRecorder
}

const (
	// ClusterConfig name to manage, since we only support one ClusterConfig
	// the object is created by the operator and it's the only one that will be managed
	instanceName = "main"

	// Name of the controller
	controllerName = "clusterconfig-controller"

	// Name of the component
	componentName = "metalk8s-clusterconfig"

	// Name of the application
	appName = "clusterconfig"
)

var log = logf.Log.WithName(controllerName)

// Create a new ClusterConfigReconciler
func newClusterConfigReconciler(mgr ctrl.Manager) *ClusterConfigReconciler {
	return &ClusterConfigReconciler{
		client:   mgr.GetClient(),
		scheme:   mgr.GetScheme(),
		recorder: mgr.GetEventRecorderFor(controllerName),
	}
}

// Add create the new Reconciler
func Add(mgr ctrl.Manager) error {
	reconciler := newClusterConfigReconciler(mgr)

	instance := &metalk8sscalitycomv1alpha1.ClusterConfig{
		ObjectMeta: metav1.ObjectMeta{Name: instanceName},
		Spec:       metalk8sscalitycomv1alpha1.ClusterConfigSpec{},
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	err := reconciler.client.Create(ctx, instance)
	if err != nil && !errors.IsAlreadyExists(err) {
		return err
	}

	return ctrl.NewControllerManagedBy(mgr).
		For(&metalk8sscalitycomv1alpha1.ClusterConfig{}).
		Owns(&metalk8sscalitycomv1alpha1.VirtualIPPool{}).
		Owns(&corev1.Namespace{}).
		Complete(reconciler)
}

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *ClusterConfigReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	reqLogger := log.WithValues("Request.Name", req.Name)
	reqLogger.Info("reconciling ClusterConfig: START")
	defer reqLogger.Info("reconciling ClusterConfig: STOP")

	instance := &metalk8sscalitycomv1alpha1.ClusterConfig{}

	err := r.client.Get(ctx, req.NamespacedName, instance)
	if err != nil {
		if errors.IsNotFound(err) {
			if req.Name == instanceName {
				// NOTE: The main ClusterConfig object get created at operator startup,
				// so if, for whatever reason, this one get deleted we just "panic" so that
				// the operator restart and re-create the ClusterConfig
				panic(fmt.Errorf(
					"%s ClusterConfig object should not be deleted", req.Name,
				))
			}
			reqLogger.Info("ClusterConfig already deleted: nothing to do")
			return utils.EndReconciliation()
		}
		reqLogger.Error(err, "cannot read ClusterConfig: requeue")
		return utils.Requeue(err)
	}

	if instance.Name != instanceName {
		if err := r.client.Delete(ctx, instance); err != nil {
			reqLogger.Error(
				err, "cannot delete extra ClusterConfig: requeue",
			)
			return utils.Requeue(err)
		}
		reqLogger.Info("deleting extra ClusterConfig, consider updating the main one", "Main.Name", instanceName)
		return utils.EndReconciliation()
	}

	// Starting here some change might be done on the cluster, so make sure to publish status update
	defer r.client.Status().Update(ctx, instance)

	subReconcilers := map[string]utils.SubReconciler{
		"ControlPlaneIngress":        &controlplane.IngressReconciler{},
		"WorkloadPlaneVirtualIPPool": &workloadplane.VirtualIPPoolReconciler{},
	}

	// Load all sub reconcilers
	for key, subrec := range subReconcilers {
		logger := reqLogger.WithValues("SubReconciler", key)
		handler := utils.NewObjectHandler(instance, r.client, r.scheme, r.recorder, logger, componentName, appName)
		subrec.Load(handler, logger, instance)
	}

	result := reconcileAllSubReconcilers(ctx, subReconcilers)

	if result.ShouldReturn() {
		instance.SetReadyCondition(metav1.ConditionFalse, "Reconciling", "Reconciliation in progress")
		return result.GetResult()
	}

	instance.SetReadyCondition(metav1.ConditionTrue, "Ready", "Everything good")

	return utils.EndReconciliation()
}

func reconcileAllSubReconcilers(ctx context.Context, subReconcilers map[string]utils.SubReconciler) utils.SubReconcilerResult {
	var wg sync.WaitGroup
	var mutex sync.Mutex
	result := utils.NothingToDo()

	// Run all sub reconcilers
	for key := range subReconcilers {
		wg.Add(1)
		go func(key string) {
			defer wg.Done()

			subrec := subReconcilers[key]

			logger := subrec.GetLogger()
			logger.Info("reconciling: START")
			defer logger.Info("reconciling: STOP")

			if res := subrec.Reconcile(ctx); res.ShouldReturn() {
				mutex.Lock()
				if res.IsSuperior(result) {
					result = res
				}
				mutex.Unlock()
			}
		}(key)
	}

	// Wait for all sub reconcilers to complete
	wg.Wait()

	return result
}

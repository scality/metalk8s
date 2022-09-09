package clusterconfig

import (
	"context"
	"fmt"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	metalk8sscalitycomv1alpha1 "github.com/scality/metalk8s/operator/api/v1alpha1"
	"github.com/scality/metalk8s/operator/pkg/controller/utils"
)

type ClusterConfigReconciler struct {
	client client.Client
	scheme *runtime.Scheme
}

// ClusterConfig name to manage, since we only support one ClusterConfig
// the object is created by the operator and it's the only one that will be managed
const instanceName = "main"

var log = logf.Log.WithName("clusterconfig-controller")

// Create a new ClusterConfigReconciler
func newClusterConfigReconciler(mgr ctrl.Manager) *ClusterConfigReconciler {
	return &ClusterConfigReconciler{
		client: mgr.GetClient(),
		scheme: mgr.GetScheme(),
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

	// TODO(user): your logic here

	return utils.EndReconciliation()
}

/*
Copyright 2022.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controllers

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
	"github.com/scality/metalk8s/operator/pkg/controller/virtualip"
)

// ClusterConfigReconciler reconciles a ClusterConfig object
type ClusterConfigReconciler struct {
	client client.Client
	scheme *runtime.Scheme
}

// Create a new ClusterConfigReconciler
func NewClusterConfigReconciler(mgr ctrl.Manager) *ClusterConfigReconciler {
	return &ClusterConfigReconciler{
		client: mgr.GetClient(),
		scheme: mgr.GetScheme(),
	}
}

// ClusterConfig name to manage, since we only support one ClusterConfig
// the object is created by the operator and it's the only one that will be managed
const InstanceName = "main"

var log = logf.Log.WithName("clusterconfig-controller")

//+kubebuilder:rbac:groups=metalk8s.scality.com,resources=clusterconfigs,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metalk8s.scality.com,resources=clusterconfigs/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=metalk8s.scality.com,resources=clusterconfigs/finalizers,verbs=update

//+kubebuilder:rbac:groups="",resources=nodes,verbs=get;list;watch
//+kubebuilder:rbac:groups="",resources=namespaces,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups="",resources=configmaps,verbs=get;list;watch;create;update;patch;delete

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the ClusterConfig object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.1/pkg/reconcile
func (r *ClusterConfigReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	reqLogger := log.WithValues("Request.Name", req.Name)
	reqLogger.Info("reconciling ClusterConfig: START")
	defer reqLogger.Info("reconciling ClusterConfig: STOP")

	instance := &metalk8sscalitycomv1alpha1.ClusterConfig{}
	err := r.client.Get(ctx, req.NamespacedName, instance)
	if err != nil {
		if errors.IsNotFound(err) {
			if req.Name == InstanceName {
				// NOTE: The main ClusterConfig object get created at operator startup,
				// so if, for whatever reason, this one get deleted we just "panic" so that
				// the operator restart and re-create the ClusterConfig
				panic(fmt.Errorf(
					"%s ClusterConfig object should not be deleted", req.Name,
				))
			}
			reqLogger.Info("ClusterConfig already deleted: nothing to do")
			return utils.EndReconciliation().GetResult()
		}
		reqLogger.Error(err, "cannot read ClusterConfig: requeue")
		return utils.Requeue(err).GetResult()
	}

	if instance.Name != InstanceName {
		if err := r.client.Delete(ctx, instance); err != nil {
			reqLogger.Error(
				err, "cannot delete extra ClusterConfig: requeue",
			)
			return utils.Requeue(err).GetResult()
		}
		reqLogger.Info("deleting extra ClusterConfig, consider updating the main one", "Main.Name", InstanceName)
		return utils.EndReconciliation().GetResult()
	}

	reconcilers := []interface {
		Reconcile(context.Context) utils.ReconcilerResult
	}{
		virtualip.NewReconciler(instance, r.client, r.scheme, reqLogger),
	}

	for _, rec := range reconcilers {
		if result := rec.Reconcile(ctx); result.ShouldReturn() {
			return result.GetResult()
		}
	}

	// TODO(user): your logic here

	return utils.EndReconciliation().GetResult()
}

// SetupWithManager sets up the controller with the Manager.
func (r *ClusterConfigReconciler) SetupWithManager(mgr ctrl.Manager) error {
	client := mgr.GetClient()

	instance := &metalk8sscalitycomv1alpha1.ClusterConfig{
		ObjectMeta: metav1.ObjectMeta{Name: InstanceName},
		Spec:       metalk8sscalitycomv1alpha1.ClusterConfigSpec{},
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	err := client.Create(ctx, instance)
	if err != nil && !errors.IsAlreadyExists(err) {
		return err
	}

	return ctrl.NewControllerManagedBy(mgr).
		For(&metalk8sscalitycomv1alpha1.ClusterConfig{}).
		Owns(&corev1.Namespace{}).
		Owns(&corev1.ConfigMap{}).
		Complete(r)
}

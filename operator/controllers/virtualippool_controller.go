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
	"github.com/scality/metalk8s/operator/pkg/controller/virtualippool"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// VirtualIPPoolReconciler reconciles a VirtualIPPool object
type VirtualIPPoolReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=metalk8s.scality.com,resources=virtualippools,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metalk8s.scality.com,resources=virtualippools/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=metalk8s.scality.com,resources=virtualippools/finalizers,verbs=update

//+kubebuilder:rbac:groups="",resources=nodes,verbs=get;list;watch
//+kubebuilder:rbac:groups="",resources=configmaps,verbs=get;list;watch;create;update;patch;delete

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the VirtualIPPool object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.2/pkg/reconcile
//func (r *VirtualIPPoolReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
//	_ = log.FromContext(ctx)
//
// 	return ctrl.Result{}, nil
//}

// SetupWithManager sets up the controller with the Manager.
func (r *VirtualIPPoolReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return virtualippool.Add(mgr)

	//return ctrl.NewControllerManagedBy(mgr).
	//	For(&metalk8sscalitycomv1alpha1.VirtualIPPool{}).
	//	Complete(r)
}

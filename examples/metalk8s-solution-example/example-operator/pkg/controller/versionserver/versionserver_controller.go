package versionserver

import (
	"context"
	"fmt"
	"os"

	examplesolutionv1alpha1 "example-operator/pkg/apis/examplesolution/v1alpha1"
	"example-operator/version"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/apimachinery/pkg/util/intstr"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	logf "sigs.k8s.io/controller-runtime/pkg/runtime/log"
	"sigs.k8s.io/controller-runtime/pkg/source"
)

/* Reconciliation of `VersionServer` Custom Resources {{{

TODO: describe logic in case of Size and/or Version mismatch

}}} */

var log = logf.Log.WithName("version-server-controller")

// Add creates a new VersionServer Controller and adds it to the Manager. The Manager will set fields on the Controller
// and Start it when the Manager is Started.
func Add(mgr manager.Manager) error {
	return add(mgr, newReconciler(mgr))
}

// newReconciler returns a new reconcile.Reconciler
func newReconciler(mgr manager.Manager) reconcile.Reconciler {
	return &ReconcileVersionServer{client: mgr.GetClient(), scheme: mgr.GetScheme()}
}

// add adds a new Controller to mgr with r as the reconcile.Reconciler
func add(mgr manager.Manager, r reconcile.Reconciler) error {
	// Create a new controller
	c, err := controller.New("version-server-controller", mgr, controller.Options{Reconciler: r})
	if err != nil {
		return err
	}

	// Watch for changes to primary resource VersionServer
	err = c.Watch(&source.Kind{Type: &examplesolutionv1alpha1.VersionServer{}}, &handler.EnqueueRequestForObject{})
	if err != nil {
		return err
	}

	// Watch for changes to secondary resources and requeue the owner VersionServer
	err = c.Watch(&source.Kind{Type: &appsv1.Deployment{}}, &handler.EnqueueRequestForOwner{
		IsController: true,
		OwnerType:    &examplesolutionv1alpha1.VersionServer{},
	})
	if err != nil {
		return err
	}

	err = c.Watch(&source.Kind{Type: &corev1.Service{}}, &handler.EnqueueRequestForOwner{
		IsController: true,
		OwnerType:    &examplesolutionv1alpha1.VersionServer{},
	})
	if err != nil {
		return err
	}

	return nil
}

// blank assignment to verify that ReconcileVersionServer implements reconcile.Reconciler
var _ reconcile.Reconciler = &ReconcileVersionServer{}

// ReconcileVersionServer reconciles a VersionServer object
type ReconcileVersionServer struct {
	// This client, initialized using mgr.Client() above, is a split client
	// that reads objects from the cache and writes to the apiserver
	client client.Client
	scheme *runtime.Scheme
}

// Reconcile reads that state of the cluster for a VersionServer object and makes changes based on the state read
// and what is in the VersionServer.Spec
// Note:
// The Controller will requeue the Request to be processed again if the returned error is non-nil or
// Result.Requeue is true, otherwise upon completion it will remove the work from the queue.
func (r *ReconcileVersionServer) Reconcile(request reconcile.Request) (reconcile.Result, error) {
	reqLogger := log.WithValues("Request.Namespace", request.Namespace, "Request.Name", request.Name)
	reqLogger.Info("Reconciling VersionServer: START")
	defer reqLogger.Info("Reconciling VersionServer: STOP")

	ctx, cancel := context.WithCancel(context.Background())
	// Cancel the request context after Reconcile returns.
	defer cancel()

	// Fetch the VersionServer instance
	instance := &examplesolutionv1alpha1.VersionServer{}
	err := r.client.Get(ctx, request.NamespacedName, instance)
	if err != nil {
		if errors.IsNotFound(err) {
			// Request object not found, could have been deleted after reconcile request.
			// Owned objects are automatically garbage collected. For additional cleanup logic use finalizers.
			// Return and don't requeue
			reqLogger.Info("VersionServer resource not found. Ignoring since object must be deleted")
			return reconcile.Result{}, nil
		}
		// Error reading the object - requeue the request.
		reqLogger.Error(err, "Failed to get Memcached")
		return reconcile.Result{}, err
	}

	// Check if the deployment already exists, if not create a new one
	found := &appsv1.Deployment{}
	err = r.client.Get(ctx, types.NamespacedName{Name: instance.Name, Namespace: instance.Namespace}, found)
	if err != nil && errors.IsNotFound(err) {
		// Define a new deployment
		dep := r.deploymentForVersionServer(instance)
		reqLogger.Info("Creating a new Deployment", "Deployment.Namespace", dep.Namespace, "Deployment.Name", dep.Name)
		err = r.client.Create(ctx, dep)
		if err != nil {
			reqLogger.Error(err, "Failed to create new Deployment", "Deployment.Namespace", dep.Namespace, "Deployment.Name", dep.Name)
			return reconcile.Result{}, err
		}
		// Deployment created successfully - return and requeue
		return reconcile.Result{Requeue: true}, nil
	} else if err != nil {
		reqLogger.Error(err, "Failed to get Deployment")
		return reconcile.Result{}, err
	}

	// Ensure the deployment size is the same as the spec
	size := instance.Spec.Replicas
	if *found.Spec.Replicas != size {
		found.Spec.Replicas = &size
		err = r.client.Update(ctx, found)
		if err != nil {
			reqLogger.Error(err, "Failed to update Deployment", "Deployment.Namespace", found.Namespace, "Deployment.Name", found.Name)
			return reconcile.Result{}, err
		}
		// Spec updated - return and requeue
		return reconcile.Result{Requeue: true}, nil
	}

	// Ensure the version is the same as well
	version := instance.Spec.Version
	depLabels := found.ObjectMeta.Labels
	deployedVersion, ok := depLabels["app.kubernetes.io/version"]
	if !ok || deployedVersion != version {
		// Update labels and image name
		labels := labelsForVersionServer(instance, true)
		image := imageForVersionServer(instance)
		found.ObjectMeta.Labels = labels
		found.Spec.Template.ObjectMeta.Labels = labels
		found.Spec.Template.Spec.Containers[0].Image = image

		err = r.client.Update(ctx, found)
		if err != nil {
			reqLogger.Error(err, "Failed to update Deployment", "Deployment.Namespace", found.Namespace, "Deployment.Name", found.Name)
			return reconcile.Result{}, err
		}
		// Spec updated - return and requeue
		return reconcile.Result{Requeue: true}, nil
	}

	// Deployment already exists - don't requeue
	reqLogger.Info("Skip reconcile: Deployment already exists", "Deployment.Namespace", found.Namespace, "Deployment.Name", found.Name)
	return reconcile.Result{}, nil
}

func (r *ReconcileVersionServer) deploymentForVersionServer(versionserver *examplesolutionv1alpha1.VersionServer) *appsv1.Deployment {
	labels := labelsForVersionServer(versionserver, true)
	labelsSelector := labelsForVersionServer(versionserver, false)
	maxSurge := intstr.FromInt(0)
	maxUnavailable := intstr.FromInt(1)

	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      versionserver.Name,
			Namespace: versionserver.Namespace,
			Labels:    labels,
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &versionserver.Spec.Replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: labelsSelector,
			},
			Strategy: appsv1.DeploymentStrategy{
				Type: appsv1.RollingUpdateDeploymentStrategyType,
				RollingUpdate: &appsv1.RollingUpdateDeployment{
					MaxSurge:       &maxSurge,
					MaxUnavailable: &maxUnavailable,
				},
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: labels,
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{{
						Image:   imageForVersionServer(versionserver),
						Name:    "version-server",
						Command: []string{"python3", "/app/server.py"},
						Ports: []corev1.ContainerPort{{
							ContainerPort: 8080,
							Name:          "version-server",
						}},
					}},
				},
			},
		},
	}

	// Set the owner reference
	controllerutil.SetControllerReference(versionserver, deployment, r.scheme)
	return deployment
}

func labelsForVersionServer(versionserver *examplesolutionv1alpha1.VersionServer, versionize bool) map[string]string {
	var labels = map[string]string{
		"app":                          "example",
		"app.kubernetes.io/name":       versionserver.Name,
		"app.kubernetes.io/component":  "version-server",
		"app.kubernetes.io/part-of":    "example",
		"app.kubernetes.io/managed-by": "example-operator",
	}
	if versionize {
		labels["app.kubernetes.io/version"] = versionserver.Spec.Version
		labels["example-solution.metalk8s.scality.com/operator-version"] = version.Version
	}
	return labels
}

func imageForVersionServer(versionserver *examplesolutionv1alpha1.VersionServer) string {
	prefix, found := os.LookupEnv("REGISTRY_PREFIX")
	if !found {
		prefix = "docker.io/metalk8s"
	}

	return fmt.Sprintf(
		"%s/example-solution-%s/base-server:%s",
		prefix, versionserver.Spec.Version, versionserver.Spec.Version,
	)
}

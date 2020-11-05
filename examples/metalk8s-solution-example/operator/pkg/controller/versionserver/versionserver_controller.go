package versionserver

import (
	"context"

	examplesolutionv1alpha1 "example-solution-operator/pkg/apis/examplesolution/v1alpha1"
	"example-solution-operator/pkg/controller/util"

	"github.com/scality/metalk8s/go/solution-operator-lib/pkg/config"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
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
func Add(mgr manager.Manager, config *config.OperatorConfig) error {
	return add(mgr, newReconciler(mgr, config))
}

// newReconciler returns a new reconcile.Reconciler
func newReconciler(
	mgr manager.Manager,
	config *config.OperatorConfig,
) reconcile.Reconciler {
	return &ReconcileVersionServer{
		client:   mgr.GetClient(),
		scheme:   mgr.GetScheme(),
		opConfig: config,
	}
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
	client   client.Client
	scheme   *runtime.Scheme
	opConfig *config.OperatorConfig
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
		reqLogger.Error(err, "Failed to get VersionServer")
		return reconcile.Result{}, err
	}
	instanceNamespacedName := types.NamespacedName{
		Name:      instance.Name,
		Namespace: instance.Namespace,
	}

	// --- Deployment ---

	// Check if the deployment already exists, if not create a new one
	deployment := &appsv1.Deployment{}
	err = r.client.Get(ctx, instanceNamespacedName, deployment)
	if err != nil && errors.IsNotFound(err) {
		// Define a new deployment
		reqLogger.Info("Creating a new Deployment", "Deployment.Namespace", instance.Namespace, "Deployment.Name", instance.Name)
		dep, err := r.deploymentForVersionServer(instance)
		if err == nil {
			err = r.client.Create(ctx, dep)
		}
		if err != nil {
			reqLogger.Error(err, "Failed to create new Deployment", "Deployment.Namespace", instance.Namespace, "Deployment.Name", instance.Name)
			return reconcile.Result{}, err
		}
		// Deployment created successfully - return and requeue
		return reconcile.Result{Requeue: true}, nil
	} else if err != nil {
		reqLogger.Error(err, "Failed to get Deployment")
		return reconcile.Result{}, err
	}

	// Ensure the deployment size is the one specified
	size := instance.Spec.Replicas
	if *deployment.Spec.Replicas != size {
		deployment.Spec.Replicas = &size
		err = r.client.Update(ctx, deployment)
		if err != nil {
			reqLogger.Error(err, "Failed to update Deployment", "Deployment.Namespace", deployment.Namespace, "Deployment.Name", deployment.Name)
			return reconcile.Result{}, err
		}
		// Spec updated - return and requeue
		return reconcile.Result{Requeue: true}, nil
	}

	// Ensure the version is the same as well
	version := instance.Spec.Version
	depLabels := deployment.ObjectMeta.Labels
	deployedVersion, ok := depLabels["app.kubernetes.io/version"]
	if !ok || deployedVersion != version {
		// Update labels and image name
		labels := labelsForVersionServer(instance)
		container, err := containerForVersionServer(instance, r.opConfig.Repositories)
		if err == nil {
			deployment.ObjectMeta.Labels = labels
			deployment.Spec.Template.ObjectMeta.Labels = labels
			deployment.Spec.Template.Spec.Containers = []corev1.Container{container}

			err = r.client.Update(ctx, deployment)
		}
		if err != nil {
			reqLogger.Error(err, "Failed to update Deployment", "Deployment.Namespace", deployment.Namespace, "Deployment.Name", deployment.Name)
			return reconcile.Result{}, err
		}
		// Spec updated - return and requeue
		return reconcile.Result{Requeue: true}, nil
	}

	// TODO: check `operator-version` annotation to trigger updates?

	// --- Deployment: done ---
	// --- Service ---

	// Check if Service exists, create it otherwise
	service := &corev1.Service{}
	err = r.client.Get(ctx, instanceNamespacedName, service)
	if err != nil && errors.IsNotFound(err) {
		// Define a new Service
		service := r.serviceForVersionServer(instance)
		reqLogger.Info("Creating a new Service", "Service.Namespace", service.Namespace, "Service.Name", service.Name)
		err = r.client.Create(ctx, service)
		if err != nil {
			reqLogger.Error(err, "Failed to create new Service", "Service.Namespace", service.Namespace, "Service.Name", service.Name)
			return reconcile.Result{}, err
		}
		// Service created successfully - return and requeue
		return reconcile.Result{Requeue: true}, nil
	} else if err != nil {
		reqLogger.Error(err, "Failed to get Service")
		return reconcile.Result{}, err
	}

	// Ensure the version exposed is up-to-date
	serviceLabels := service.ObjectMeta.Labels
	exposedVersion, ok := serviceLabels["app.kubernetes.io/version"]
	if !ok || exposedVersion != version {
		labels := labelsForVersionServer(instance)
		service.ObjectMeta.Labels = labels
		err = r.client.Update(ctx, service)
		if err != nil {
			reqLogger.Error(err, "Failed to update Service", "Service.Namespace", service.Namespace, "Service.Name", service.Name)
			return reconcile.Result{}, err
		}
		// Spec updated - return and requeue
		return reconcile.Result{Requeue: true}, nil
	}

	// TODO: check `operator-version` annotation to trigger updates?

	/// --- Service: done ---

	reqLogger.Info("Skip reconcile: Everything is up-to-date")
	return reconcile.Result{}, nil
}

func (r *ReconcileVersionServer) deploymentForVersionServer(versionserver *examplesolutionv1alpha1.VersionServer) (*appsv1.Deployment, error) {
	container, err := containerForVersionServer(versionserver, r.opConfig.Repositories)
	if err != nil {
		return nil, err
	}

	deployment := util.BuildDeployment(
		versionserver.Name,
		versionserver.Namespace,
		versionserver.Spec.Version,
		util.VersionServerKind,
		versionserver.Spec.Replicas,
		container,
	)

	// Set the owner reference
	controllerutil.SetControllerReference(versionserver, deployment, r.scheme)
	return deployment, nil
}

func (r *ReconcileVersionServer) serviceForVersionServer(versionserver *examplesolutionv1alpha1.VersionServer) *corev1.Service {
	service := util.BuildService(
		versionserver.Name,
		versionserver.Namespace,
		versionserver.Spec.Version,
		util.VersionServerKind,
	)

	// Set the owner reference
	controllerutil.SetControllerReference(versionserver, service, r.scheme)
	return service
}

func containerForVersionServer(
	versionserver *examplesolutionv1alpha1.VersionServer,
	repositories map[string][]config.Repository,
) (corev1.Container, error) {
	return util.BuildContainer(
		versionserver.Spec.Version,
		versionserver.Name,
		util.VersionServerKind,
		[]string{"--version", versionserver.Spec.Version},
		repositories,
	)
}

func labelsForVersionServer(versionserver *examplesolutionv1alpha1.VersionServer) map[string]string {
	return util.BuildLabels(
		util.VersionServerKind,
		versionserver.Name,
		versionserver.Spec.Version,
	)
}

package clockserver

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

/* Reconciliation of `ClockServer` Custom Resources {{{

TODO: describe logic in case of Size and/or Version mismatch

}}} */

var log = logf.Log.WithName("controller_clockserver")

// Add creates a new ClockServer Controller and adds it to the Manager. The Manager will set fields on the Controller
// and Start it when the Manager is Started.
func Add(mgr manager.Manager, config *config.OperatorConfig) error {
	return add(mgr, newReconciler(mgr, config))
}

// newReconciler returns a new reconcile.Reconciler
func newReconciler(
	mgr manager.Manager,
	config *config.OperatorConfig,
) reconcile.Reconciler {
	return &ReconcileClockServer{
		client:   mgr.GetClient(),
		scheme:   mgr.GetScheme(),
		opConfig: config,
	}
}

// add adds a new Controller to mgr with r as the reconcile.Reconciler
func add(mgr manager.Manager, r reconcile.Reconciler) error {
	// Create a new controller
	c, err := controller.New("clockserver-controller", mgr, controller.Options{Reconciler: r})
	if err != nil {
		return err
	}

	// Watch for changes to primary resource ClockServer
	err = c.Watch(&source.Kind{Type: &examplesolutionv1alpha1.ClockServer{}}, &handler.EnqueueRequestForObject{})
	if err != nil {
		return err
	}

	// Watch for changes to secondary resources and requeue the owner ClockServer
	err = c.Watch(&source.Kind{Type: &appsv1.Deployment{}}, &handler.EnqueueRequestForOwner{
		IsController: true,
		OwnerType:    &examplesolutionv1alpha1.ClockServer{},
	})
	if err != nil {
		return err
	}

	err = c.Watch(&source.Kind{Type: &corev1.Service{}}, &handler.EnqueueRequestForOwner{
		IsController: true,
		OwnerType:    &examplesolutionv1alpha1.ClockServer{},
	})
	if err != nil {
		return err
	}

	return nil
}

// blank assignment to verify that ReconcileClockServer implements reconcile.Reconciler
var _ reconcile.Reconciler = &ReconcileClockServer{}

// ReconcileClockServer reconciles a ClockServer object
type ReconcileClockServer struct {
	// This client, initialized using mgr.Client() above, is a split client
	// that reads objects from the cache and writes to the apiserver
	client   client.Client
	scheme   *runtime.Scheme
	opConfig *config.OperatorConfig
}

// Reconcile reads that state of the cluster for a ClockServer object and makes changes based on the state read
// and what is in the ClockServer.Spec
// Note:
// The Controller will requeue the Request to be processed again if the returned error is non-nil or
// Result.Requeue is true, otherwise upon completion it will remove the work from the queue.
func (r *ReconcileClockServer) Reconcile(request reconcile.Request) (reconcile.Result, error) {
	reqLogger := log.WithValues("Request.Namespace", request.Namespace, "Request.Name", request.Name)
	reqLogger.Info("Reconciling ClockServer: START")
	defer reqLogger.Info("Reconciling ClockServer: STOP")

	ctx, cancel := context.WithCancel(context.Background())
	// Cancel the request context after Reconcile returns.
	defer cancel()

	// Fetch the ClockServer instance
	instance := &examplesolutionv1alpha1.ClockServer{}
	err := r.client.Get(ctx, request.NamespacedName, instance)
	if err != nil {
		if errors.IsNotFound(err) {
			// Request object not found, could have been deleted after reconcile request.
			// Owned objects are automatically garbage collected. For additional cleanup logic use finalizers.
			// Return and don't requeue
			reqLogger.Info("ClockServer resource not found. Ignoring since object must be deleted")
			return reconcile.Result{}, nil
		}
		// Error reading the object - requeue the request.
		reqLogger.Error(err, "Failed to get ClockServer")
		return reconcile.Result{}, err
	}
	instanceNamespacedName := types.NamespacedName{
		Name:      instance.Name,
		Namespace: instance.Namespace,
	}

	// --- Deployment ---

	// Check if the deployment already exists, if not create a new one
	found := &appsv1.Deployment{}
	err = r.client.Get(ctx, instanceNamespacedName, found)
	if err != nil && errors.IsNotFound(err) {
		// Define a new deployment
		reqLogger.Info("Creating a new Deployment", "Deployment.Namespace", instance.Namespace, "Deployment.Name", instance.Name)
		dep, err := r.deploymentForClockServer(instance)
		if err == nil {
			err = r.client.Create(ctx, dep)
		}
		if err != nil {
			reqLogger.Error(err, "Failed to create new Deployment", "Deployment.Namespace", instance.Namespace, instance.Name)
			return reconcile.Result{}, err
		}
		// Deployment created successfully - return and requeue
		return reconcile.Result{Requeue: true}, nil
	} else if err != nil {
		reqLogger.Error(err, "Failed to get Deployment")
		return reconcile.Result{}, err
	}

	// Ensure the timezone is the same as the spec
	timezone := instance.Spec.Timezone
	depAnnotations := found.ObjectMeta.Annotations
	deployedTimezone, ok := depAnnotations["example-solution.metalk8s.scality.com/clock-timezone"]
	if !ok || deployedTimezone != timezone {
		// Refresh .spec.template and .metadata.{labels,annotations}
		newDep, err := r.deploymentForClockServer(instance)

		if err == nil {
			found.Spec.Template = newDep.Spec.Template
			for label, value := range newDep.ObjectMeta.Labels {
				found.ObjectMeta.Labels[label] = value
			}
			for annotation, value := range newDep.ObjectMeta.Annotations {
				found.ObjectMeta.Annotations[annotation] = value
			}

			err = r.client.Update(ctx, found)
		}
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
		// Update labels and container
		labels := labelsForClockServer(instance)
		container, err := containerForClockServer(instance, r.opConfig.Repositories)
		if err == nil {
			found.ObjectMeta.Labels = labels
			found.Spec.Template.ObjectMeta.Labels = labels
			found.Spec.Template.Spec.Containers = []corev1.Container{container}

			err = r.client.Update(ctx, found)
		}
		if err != nil {
			reqLogger.Error(err, "Failed to update Deployment", "Deployment.Namespace", found.Namespace, "Deployment.Name", found.Name)
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
		service := r.serviceForClockServer(instance)
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
		labels := labelsForClockServer(instance)
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

	reqLogger.Info("Skip reconcile: Deployment already exists", "Deployment.Namespace", found.Namespace, "Deployment.Name", found.Name)
	return reconcile.Result{}, nil
}

func (r *ReconcileClockServer) deploymentForClockServer(clockserver *examplesolutionv1alpha1.ClockServer) (*appsv1.Deployment, error) {
	replicas := int32(1)
	container, err := containerForClockServer(clockserver, r.opConfig.Repositories)

	if err != nil {
		return nil, err
	}

	deployment := util.BuildDeployment(
		clockserver.Name,
		clockserver.Namespace,
		clockserver.Spec.Version,
		util.ClockServerKind,
		replicas,
		container,
	)

	// Set the owner reference
	controllerutil.SetControllerReference(clockserver, deployment, r.scheme)
	return deployment, nil
}

func (r *ReconcileClockServer) serviceForClockServer(clockserver *examplesolutionv1alpha1.ClockServer) *corev1.Service {
	service := util.BuildService(
		clockserver.Name,
		clockserver.Namespace,
		clockserver.Spec.Version,
		util.ClockServerKind,
	)

	// Set the owner reference
	controllerutil.SetControllerReference(clockserver, service, r.scheme)
	return service
}

func containerForClockServer(
	clockserver *examplesolutionv1alpha1.ClockServer,
	repositories map[string][]config.Repository,
) (corev1.Container, error) {
	return util.BuildContainer(
		clockserver.Spec.Version,
		clockserver.Name,
		util.ClockServerKind,
		[]string{"--clock", clockserver.Spec.Timezone},
		repositories,
	)
}

func labelsForClockServer(clockserver *examplesolutionv1alpha1.ClockServer) map[string]string {
	return util.BuildLabels(
		util.ClockServerKind,
		clockserver.Name,
		clockserver.Spec.Version,
	)
}

package clockserver

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

/* Reconciliation of `ClockServer` Custom Resources {{{

TODO: describe logic in case of Size and/or Version mismatch

}}} */

var log = logf.Log.WithName("controller_clockserver")

// Add creates a new ClockServer Controller and adds it to the Manager. The Manager will set fields on the Controller
// and Start it when the Manager is Started.
func Add(mgr manager.Manager) error {
	return add(mgr, newReconciler(mgr))
}

// newReconciler returns a new reconcile.Reconciler
func newReconciler(mgr manager.Manager) reconcile.Reconciler {
	return &ReconcileClockServer{client: mgr.GetClient(), scheme: mgr.GetScheme()}
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
	client client.Client
	scheme *runtime.Scheme
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
		dep := r.deploymentForClockServer(instance)
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

	// Ensure the timezone is the same as the spec
	timezone := instance.Spec.Timezone
	depAnnotations := found.ObjectMeta.Annotations
	deployedTimezone, ok := depAnnotations["example-solution.metalk8s.scality.com/clock-timezone"]
	if !ok || deployedTimezone != timezone {
		// Refresh .spec.template and .metadata.{labels,annotations}
		newDep := r.deploymentForClockServer(instance)
		found.Spec.Template = newDep.Spec.Template
		for label, value := range newDep.ObjectMeta.Labels {
			found.ObjectMeta.Labels[label] = value
		}
		for annotation, value := range newDep.ObjectMeta.Annotations {
			found.ObjectMeta.Annotations[annotation] = value
		}

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
		// Update labels and container
		labels := labelsForClockServer(instance)
		labelSelector := metav1.LabelSelector{
			MatchLabels: labels,
		}
		found.ObjectMeta.Labels = labels
		found.Spec.Template.ObjectMeta.Labels = labels
		found.Spec.Selector = &labelSelector
		found.Spec.Template.Spec.Containers = []corev1.Container{
			containerForClockServer(instance),
		}

		err = r.client.Update(ctx, found)
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
		service.Spec.Selector = labels
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

func (r *ReconcileClockServer) deploymentForClockServer(clockserver *examplesolutionv1alpha1.ClockServer) *appsv1.Deployment {
	labels := labelsForClockServer(clockserver)
	labelsSelector := metav1.LabelSelector{
		MatchLabels: labels,
	}
	annotations := annotationsForClockServer(clockserver)
	maxSurge := intstr.FromInt(0)
	maxUnavailable := intstr.FromInt(1)
	replicas := int32(1)

	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:        clockserver.Name,
			Namespace:   clockserver.Namespace,
			Labels:      labels,
			Annotations: annotations,
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &labelsSelector,
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
					Containers: []corev1.Container{
						containerForClockServer(clockserver),
					},
				},
			},
		},
	}

	// Set the owner reference
	controllerutil.SetControllerReference(clockserver, deployment, r.scheme)
	return deployment
}

func (r *ReconcileClockServer) serviceForClockServer(clockserver *examplesolutionv1alpha1.ClockServer) *corev1.Service {
	labels := labelsForClockServer(clockserver)
	annotations := annotationsForClockServer(clockserver)

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:        clockserver.Name,
			Namespace:   clockserver.Namespace,
			Labels:      labels,
			Annotations: annotations,
		},
		Spec: corev1.ServiceSpec{
			Ports: []corev1.ServicePort{{
				Name:       "http",
				Port:       8080,
				Protocol:   corev1.ProtocolTCP,
				TargetPort: intstr.FromString("http"),
			}},
			Selector: labels,
			Type:     corev1.ServiceTypeClusterIP,
		},
	}

	// Set the owner reference
	controllerutil.SetControllerReference(clockserver, service, r.scheme)
	return service
}

func containerForClockServer(clockserver *examplesolutionv1alpha1.ClockServer) corev1.Container {
	timezone := clockserver.Spec.Timezone
	if clockserver.Spec.Version == "2.0.0-beta1" {
		// Emulate a broken version (could have changed the image, but meh)
		timezone = "BROKEN"
	}
	return corev1.Container{
		Image: imageForClockServer(clockserver),
		Name:  "clock-server",
		Command: []string{
			"python3",
			"/app/server.py",
			"--clock", timezone,
		},
		LivenessProbe: &corev1.Probe{
			Handler: corev1.Handler{
				HTTPGet: &corev1.HTTPGetAction{
					Path:   "/time",
					Port:   intstr.FromInt(8080),
					Scheme: corev1.URISchemeHTTP,
				},
			},
			FailureThreshold:    8,
			InitialDelaySeconds: 10,
			TimeoutSeconds:      3,
		},
		Ports: []corev1.ContainerPort{{
			ContainerPort: 8080,
			Name:          "http",
		}},
	}
}

func labelsForClockServer(clockserver *examplesolutionv1alpha1.ClockServer) map[string]string {
	return map[string]string{
		"app":                          "example",
		"app.kubernetes.io/name":       clockserver.Name,
		"app.kubernetes.io/component":  "clock-server",
		"app.kubernetes.io/part-of":    "example",
		"app.kubernetes.io/managed-by": "example-operator",
		"app.kubernetes.io/version":    clockserver.Spec.Version,
	}
}

func annotationsForClockServer(clockserver *examplesolutionv1alpha1.ClockServer) map[string]string {
	return map[string]string{
		"example-solution.metalk8s.scality.com/operator-version": version.Version,
		"example-solution.metalk8s.scality.com/clock-timezone":   clockserver.Spec.Timezone,
	}
}

func imageForClockServer(clockserver *examplesolutionv1alpha1.ClockServer) string {
	prefix, found := os.LookupEnv("REGISTRY_PREFIX")
	if !found {
		prefix = "docker.io/metalk8s"
	}

	return fmt.Sprintf(
		"%[1]s/example-solution-%[2]s/base-server:%[2]s",
		prefix, clockserver.Spec.Version,
	)
}

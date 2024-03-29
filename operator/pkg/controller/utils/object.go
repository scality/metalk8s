package utils

import (
	"context"
	"reflect"

	"github.com/go-logr/logr"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"github.com/scality/metalk8s/operator/version"
)

const (
	labelManagedByName  = "app.kubernetes.io/managed-by"
	labelManagedByValue = "metalk8s-operator"

	labelPartOfName  = "app.kubernetes.io/part-of"
	labelPartOfValue = "metalk8s"

	labelComponentName = "app.kubernetes.io/component"
	labelAppName       = "app.kubernetes.io/name"
	labelInstanceName  = "app.kubernetes.io/instance"

	labelVersionName      = "app.kubernetes.io/version"
	labelMetalVersionName = "metalk8s.scality.com/version"
)

var (
	stdLabels = map[string]string{
		labelManagedByName:    labelManagedByValue,
		labelPartOfName:       labelPartOfValue,
		labelMetalVersionName: version.Version,

		// NOTE: This Version label should be the component version,
		// we default it to MetalK8s version but it can be updated using
		// SetVersionLabel function
		labelVersionName: version.Version,
	}

	// List of labels used as Selector for DaemonSet pods
	// NOTE: It's the default set by the ObjectHandler but those labels can be changed
	// by the `mutate` function
	selectorLabels = []string{
		labelAppName,
		labelInstanceName,
	}
)

// Struct used to manage Kubernetes objects creation, update and deletion
// that allow to use a single entry point to manage various objects and properly
// log actions and add some standard metadata
type ObjectHandler struct {
	// The client used to interact with the APIServer
	Client client.Client

	// The Instance object used as Owner reference on every objects
	instance client.Object

	// The Instance Object Scheme
	scheme *runtime.Scheme
	// The Recorder used to send events
	recorder record.EventRecorder
	// The Logger that will be used by ObjectHandler functions
	logger logr.Logger

	// Component name that will be used as Label on every objects managed by this ObjectHandler
	component string

	labels map[string]string
}

// Initiate an ObjectHandler struct
func NewObjectHandler(instance client.Object, client client.Client, scheme *runtime.Scheme, recorder record.EventRecorder, logger logr.Logger, component string, name string) *ObjectHandler {
	labels := map[string]string{}
	for k, v := range stdLabels {
		labels[k] = v
	}
	labels[labelComponentName] = component
	labels[labelAppName] = name
	labels[labelInstanceName] = instance.GetName()

	return &ObjectHandler{
		instance:  instance,
		Client:    client,
		scheme:    scheme,
		recorder:  recorder,
		logger:    logger,
		component: component,
		labels:    labels,
	}
}

// Send an event to the instance
func (h ObjectHandler) SendEvent(status metav1.ConditionStatus, reason string, message string) {
	eventType := corev1.EventTypeNormal
	if status == metav1.ConditionUnknown {
		eventType = corev1.EventTypeWarning
	}
	h.recorder.Event(h.instance, eventType, reason, message)
}

// Create, Update or delete objects so that it match desired object from args
// return wether or not some objects get changed (Created, Updated, Deleted)
// NOTE: The objsToUpdate contains the objects to Update and to Create
// NOTE: This function will call the mutate function on every objects to Update
// (check controllerutil.CreateOrUpdate for more information)
// NOTE: (To keep in mind) This function will Create, Update, Delete all objects
// in a single call (so in a single Reconcile loop) but stop on the first error
func (h ObjectHandler) CreateOrUpdateOrDelete(ctx context.Context, objsToUpdate []client.Object, objsToDelete []client.Object, mutate func(client.Object) error) (bool, error) {
	changed := false

	for _, obj := range objsToUpdate {
		result, err := controllerutil.CreateOrUpdate(ctx, h.Client, obj, func() error {
			// Update object to add standard Metadata
			if err := h.stdMutate(obj); err != nil {
				return err
			}

			if mutate != nil {
				return mutate(obj)
			}
			return nil
		})
		if err != nil {
			return changed, err
		}
		if result != controllerutil.OperationResultNone {
			h.logger.Info("object update", "Object.Type", reflect.TypeOf(obj), "Object.Key", client.ObjectKeyFromObject(obj), "Operation", result)
			changed = true
		}
	}

	for _, obj := range objsToDelete {
		if err := h.Client.Get(ctx, client.ObjectKeyFromObject(obj), obj); err != nil {
			if errors.IsNotFound(err) {
				// The obj is already absent
				continue
			}
			return changed, err
		}
		if err := h.Client.Delete(ctx, obj); err != nil {
			return changed, err
		}
		h.logger.Info("object deletion", "Object.Type", reflect.TypeOf(obj), "Object.Key", client.ObjectKeyFromObject(obj), "Operation", "deleted")

		// If there is no error, a delete always mean a change
		changed = true
	}

	return changed, nil
}

// Standard mutate for all Objects to set some basic Metadata
func (h ObjectHandler) stdMutate(object metav1.Object) error {
	UpdateLabels(object, h.labels)

	switch object.(type) {
	case *appsv1.DaemonSet:
		h.stdMutateDaemonSet(object.(*appsv1.DaemonSet))
	}

	return controllerutil.SetControllerReference(h.instance, object, h.scheme)
}

func (h ObjectHandler) stdMutateDaemonSet(object *appsv1.DaemonSet) {
	UpdateLabels(&object.Spec.Template.ObjectMeta, h.labels)

	selector := h.getSelectorLabels()

	object.Spec.Selector = &metav1.LabelSelector{MatchLabels: selector}
	UpdateLabels(&object.Spec.Template.ObjectMeta, selector)
}

func (h ObjectHandler) getSelectorLabels() client.MatchingLabels {
	selector := make(client.MatchingLabels)
	for _, label := range selectorLabels {
		selector[label] = h.labels[label]
	}

	return selector
}

// Get Standard Labels matcher that can be used to list objects
func (h ObjectHandler) GetMatchingLabels(includeVersion bool) client.MatchingLabels {
	labels := make(client.MatchingLabels)
	for k, v := range h.labels {
		if includeVersion || (k != labelVersionName && k != labelMetalVersionName) {
			labels[k] = v
		}
	}
	return labels
}

// Update labels on an Object
func UpdateLabels(object metav1.Object, labels map[string]string) {
	current := object.GetLabels()
	if current == nil {
		current = make(map[string]string)
	}

	for k, v := range labels {
		current[k] = v
	}

	object.SetLabels(current)
}

// Update annotations on an Object
func UpdateAnnotations(object metav1.Object, annotations map[string]string) {
	current := object.GetAnnotations()
	if current == nil {
		current = make(map[string]string)
	}

	for k, v := range annotations {
		current[k] = v
	}

	object.SetAnnotations(current)
}

// Set version labels on an Object, default to the MetalK8s version
func SetVersionLabel(object metav1.Object, version string) {
	UpdateLabels(object, map[string]string{labelVersionName: version})
}

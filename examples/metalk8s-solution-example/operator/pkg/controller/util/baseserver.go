package util

import (
	"example-solution-operator/version"
	"fmt"
	"os"

	"github.com/scality/metalk8s/go/solution-operator-lib/pkg/config"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

// ServerKind describes the kind of `base-server` component to manage
type ServerKind string

const (
	// VersionServerKind describe `base-server` using `--version`
	VersionServerKind ServerKind = "version-server"
	// ClockServerKind describe `base-server` using `--clock`
	ClockServerKind ServerKind = "clock-server"
)

const (
	// ApplicationName is the name of the Solution for this Operator
	ApplicationName = "example-solution"

	// ApplicationAPIGroup is the API group in which this Solution CRDs are
	// stored
	ApplicationAPIGroup = "example-solution.metalk8s.scality.com"

	// ContainerHTTPPort is the HTTP port number used by `base-server`
	ContainerHTTPPort = 8080

	// DefaultOperatorName is the default name for this Operator
	DefaultOperatorName = "example-solution-operator"
)

// commonLabels returns a map of common labels to use in objects managed by
// this Operator
func commonLabels() map[string]string {
	return map[string]string{
		"app":                          ApplicationName,
		"app.kubernetes.io/part-of":    ApplicationName,
		"app.kubernetes.io/managed-by": getOperatorName(),
	}
}

// commonAnnotations returns a map of common annotations to use in objects
// managed by this Operator
func commonAnnotations() map[string]string {
	return map[string]string{
		namespacedKey("operator-version"): version.Version,
	}
}

// namespacedKey generates a label/annotation key with the Solution API group
// as prefix
func namespacedKey(key string) string {
	return fmt.Sprintf("%s/%s", ApplicationAPIGroup, key)
}

// getOperatorName returns the active Operator name as exposed in an environment
// variable, with a default value if not set
func getOperatorName() string {
	name, found := os.LookupEnv("OPERATOR_NAME")
	if !found {
		name = DefaultOperatorName
	}

	return name
}

// BuildLabels builds a set of labels for a component of a given kind
func BuildLabels(
	kind ServerKind, name string, version string,
) map[string]string {
	labels := commonLabels()
	labels["app.kubernetes.io/component"] = string(kind)
	labels["app.kubernetes.io/name"] = name
	labels["app.kubernetes.io/version"] = version
	return labels
}

// BuildLabelSelector extracts a LabelSelector from a map of labels
func BuildLabelSelector(labels map[string]string) metav1.LabelSelector {
	immutableLabels := []string{
		"app.kubernetes.io/name",
		"app.kubernetes.io/component",
		"app.kubernetes.io/part-of",
		"app.kubernetes.io/managed-by",
	}

	result := make(map[string]string)
	for _, key := range immutableLabels {
		value, ok := labels[key]
		if ok {
			result[key] = value
		} else {
			// TODO: log something
		}
	}

	return metav1.LabelSelector{
		MatchLabels: result,
	}
}

// buildImageName builds a complete image name based on the version provided
// for the `base-server` component, which is the only one deployed for now
// Here `version` is both the image and the Solution versions
func buildImageName(version string, repositories map[string][]config.Repository) (string, error) {
	var imageName string = "base-server:" + version
	var prefix string

	for solution_version, repositories := range repositories {
		if solution_version == version {
			for _, repository := range repositories {
				for _, image := range repository.Images {
					if image == imageName {
						prefix = repository.Endpoint
					}
				}
			}
		}
	}

	if prefix == "" {
		return "", fmt.Errorf(
			"Unable to find image %s in repositories configuration",
			imageName,
		)
	}

	return fmt.Sprintf("%s/%s", prefix, imageName), nil
}

// BuildContainer builds a container image for a component of kind `kind`
func BuildContainer(
	version string, name string, kind ServerKind, cmdArgs []string,
	repositories map[string][]config.Repository,
) (corev1.Container, error) {
	var path string
	switch kind {
	case VersionServerKind:
		path = "/version"
	case ClockServerKind:
		path = "/time"
	}

	imageName, err := buildImageName(version, repositories)
	if err != nil {
		return corev1.Container{}, err
	}

	return corev1.Container{
		Image:   imageName,
		Name:    string(kind),
		Command: append([]string{"python3", "/app/server.py"}, cmdArgs...),
		LivenessProbe: &corev1.Probe{
			Handler: corev1.Handler{
				HTTPGet: &corev1.HTTPGetAction{
					Path:   path,
					Port:   intstr.FromInt(ContainerHTTPPort),
					Scheme: corev1.URISchemeHTTP,
				},
			},
			FailureThreshold:    8,
			InitialDelaySeconds: 10,
			TimeoutSeconds:      3,
		},
		Ports: []corev1.ContainerPort{{
			ContainerPort: ContainerHTTPPort,
			Name:          "http",
		}},
	}, nil
}

// BuildService builds a Service object for a component
func BuildService(
	name string, namespace string, version string, kind ServerKind,
) *corev1.Service {
	labels := BuildLabels(kind, name, version)
	annotations := commonAnnotations()

	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:        name,
			Namespace:   namespace,
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
			Selector: BuildLabelSelector(labels).MatchLabels,
			Type:     corev1.ServiceTypeClusterIP,
		},
	}
}

// BuildDeployment builds a Deployment object for a component
func BuildDeployment(
	name string,
	namespace string,
	version string,
	kind ServerKind,
	replicas int32,
	container corev1.Container,
) *appsv1.Deployment {
	labels := BuildLabels(kind, name, version)
	labelSelector := BuildLabelSelector(labels)

	annotations := commonAnnotations()
	if kind == ClockServerKind {
		// FIXME: hackish, needs to move in the controller-specific logic
		lastCmdArg := container.Command[len(container.Command)-1]
		annotations[namespacedKey("clock-timezone")] = lastCmdArg
	}

	maxSurge := intstr.FromInt(0)
	maxUnavailable := intstr.FromInt(1)

	return &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:        name,
			Namespace:   namespace,
			Labels:      labels,
			Annotations: annotations,
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &labelSelector,
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
					Containers: []corev1.Container{container},
				},
			},
		},
	}
}

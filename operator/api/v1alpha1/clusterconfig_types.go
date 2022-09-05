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

package v1alpha1

import (
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

type SpreadConstraintSpec struct {
	// Topology label to use to spread the Virtual IPs
	TopologyKey string `json:"topologyKey"`
}

// +kubebuilder:validation:Format=ipv4
type IPAddress string

type VirtualIPPoolSpec struct {
	// Node Selector to deploy the Virtual IPs manager
	// +optional
	NodeSelector map[string]string `json:"nodeSelector,omitempty"`
	// Tolerations to deploy the Virtual IPs manager
	// +optional
	Tolerations []corev1.Toleration `json:"tolerations,omitempty"`
	// Spread constraints for the Virtual IPs
	// NOTE: Not supported yet
	// // +optional
	// SpreadConstraints []SpreadConstraintSpec `json:"spreadConstraints,omitempty"`

	// Virtual IP addresses to use
	// +kubebuilder:validation:MinItems=1
	Addresses []IPAddress `json:"addresses"`
}

type WorkloadPlaneSpec struct {
	// Information about Virtual IP Pools
	// +optional
	VirtualIPPools map[string]VirtualIPPoolSpec `json:"virtualIPPools,omitempty"`
}

// ClusterConfigSpec defines the desired state of ClusterConfig
type ClusterConfigSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// Information about the Workload Plane.
	// +optional
	WorkloadPlane WorkloadPlaneSpec `json:"workloadPlane,omitempty"`
}

// ClusterConfigStatus defines the observed state of ClusterConfig
type ClusterConfigStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// List of conditions for the ClusterConfig
	Conditions []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type" protobuf:"bytes,1,rep,name=conditions"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Cluster

// ClusterConfig is the Schema for the clusterconfigs API
type ClusterConfig struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClusterConfigSpec   `json:"spec,omitempty"`
	Status ClusterConfigStatus `json:"status,omitempty"`
}

// Set a condition for the ClusterConfig.
//
// If a condition of this type already exists it is updated, otherwise a new
// condition is added.
//
// Arguments
//
//	kind:      type of condition
//	status:    status of the condition
//	reason:    one-word, CamelCase reason for the transition
//	message:   details about the transition
func (c *ClusterConfig) SetCondition(
	kind string,
	status metav1.ConditionStatus,
	reason string,
	message string,
) {
	condition := metav1.Condition{
		Type:               kind,
		Status:             status,
		ObservedGeneration: c.Generation,
		LastTransitionTime: metav1.Now(),
		Reason:             reason,
		Message:            message,
	}

	for idx, cond := range c.Status.Conditions {
		if cond.Type == kind {
			// Don't update timestamps if status hasn't changed.
			if cond.Status == condition.Status {
				condition.LastTransitionTime = cond.LastTransitionTime
			}
			c.Status.Conditions[idx] = condition
			return
		}
	}
	c.Status.Conditions = append(c.Status.Conditions, condition)
}

// Get the condition identified by `kind` for the ClusterConfig.
//
// Return `nil` if no such condition exists.
func (c *ClusterConfig) GetCondition(kind string) *metav1.Condition {
	for _, cond := range c.Status.Conditions {
		if cond.Type == kind {
			return &cond
		}
	}
	return nil
}

//+kubebuilder:object:root=true

// ClusterConfigList contains a list of ClusterConfig
type ClusterConfigList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ClusterConfig `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ClusterConfig{}, &ClusterConfigList{})
}

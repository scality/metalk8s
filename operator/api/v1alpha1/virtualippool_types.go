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

// VirtualIPPoolSpec defines the desired state of VirtualIPPool
type VirtualIPPoolSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "make" to regenerate code after modifying this file

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

// VirtualIPPoolStatus defines the observed state of VirtualIPPool
type VirtualIPPoolStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status

// VirtualIPPool is the Schema for the virtualippools API
type VirtualIPPool struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   VirtualIPPoolSpec   `json:"spec,omitempty"`
	Status VirtualIPPoolStatus `json:"status,omitempty"`
}

// Compute the ConfigMap name for a pool
func (v *VirtualIPPool) GetConfigMap() *corev1.ConfigMap {
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      v.GetName(),
			Namespace: v.GetNamespace(),
		},
	}
}

//+kubebuilder:object:root=true

// VirtualIPPoolList contains a list of VirtualIPPool
type VirtualIPPoolList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []VirtualIPPool `json:"items"`
}

func init() {
	SchemeBuilder.Register(&VirtualIPPool{}, &VirtualIPPoolList{})
}

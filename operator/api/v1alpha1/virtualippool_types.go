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
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

type SpreadConstraintSpec struct {
	// Topology label to use to spread the Virtual IPs
	TopologyKey string `json:"topologyKey"`
}

type HttpGetSpec struct {
	// The IP to do the HTTP request
	// (default to keepalived Pod IP)
	// +optional
	IP IPAddress `json:"host,omitempty"`
	// The scheme to use for the HTTP request
	// (default to HTTPS)
	// +optional
	// +kubebuilder:default="HTTPS"
	// +kubebuilder:validation:Enum={"HTTP", "HTTPS"}
	Scheme string `json:"scheme"`
	// The port to do the HTTP request
	// +optional
	// +kubebuilder:default=443
	Port int `json:"port"`
	// Path for the HTTP request
	// +optional
	Path string `json:"path"`
}

type HealthcheckSpec struct {
	// Simple HTTP Get check
	HttpGet HttpGetSpec `json:"httpGet,omitempty"`
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

	// The local health check to run to ensure the Virtual IP can sit on
	// this specific node
	Healthcheck *HealthcheckSpec `json:"healthcheck,omitempty"`
}

// VirtualIPPoolStatus defines the observed state of VirtualIPPool
type VirtualIPPoolStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file

	// List of conditions for the VirtualIPPool
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type" protobuf:"bytes,1,rep,name=conditions"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:shortName=vipp

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

// Compute the DaemonSet name for a pool
func (v *VirtualIPPool) GetDaemonSet() *appsv1.DaemonSet {
	return &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:      v.GetName(),
			Namespace: v.GetNamespace(),
		},
	}
}

// Set a condition on VirtualIPPool
func (v *VirtualIPPool) SetCondition(kind string, status metav1.ConditionStatus, reason string, message string) {
	setCondition(v.Generation, &v.Status.Conditions, kind, status, reason, message)
}

// Get a condition from VirtualIPPool
func (v *VirtualIPPool) GetCondition(kind string) *Condition {
	return getCondition(v.Status.Conditions, kind)
}

// Set Configured Condition
func (v *VirtualIPPool) SetConfiguredCondition(status metav1.ConditionStatus, reason string, message string) {
	v.SetCondition(configuredConditionName, status, reason, message)
}

// Set Available Condition
func (v *VirtualIPPool) SetAvailableCondition(status metav1.ConditionStatus, reason string, message string) {
	v.SetCondition(availableConditionName, status, reason, message)
}

// Set Ready Condition
func (v *VirtualIPPool) SetReadyCondition(status metav1.ConditionStatus, reason string, message string) {
	v.SetCondition(readyConditionName, status, reason, message)
}

// Get Ready Condition
func (v *VirtualIPPool) GetReadyCondition() *Condition {
	return v.GetCondition(readyConditionName)
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

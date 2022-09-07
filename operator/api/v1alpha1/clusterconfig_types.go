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
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	vIPConfiguredConditionName = "VirtualIPPool" + configuredConditionName
	vIPReadyConditionName      = "VirtualIPPool" + readyConditionName
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

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
	// +patchMergeKey=type
	// +patchStrategy=merge
	// +listType=map
	// +listMapKey=type
	Conditions []Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type" protobuf:"bytes,1,rep,name=conditions"`
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

// Set a condition on ClusterConfig
func (v *ClusterConfig) SetCondition(kind string, status metav1.ConditionStatus, reason string, message string) {
	setCondition(v.Generation, &v.Status.Conditions, kind, status, reason, message)
}

// Get a condition from ClusterConfig
func (v *ClusterConfig) GetCondition(kind string) *Condition {
	return getCondition(v.Status.Conditions, kind)
}

// Set Ready Condition
func (v *ClusterConfig) SetReadyCondition(status metav1.ConditionStatus, reason string, message string) {
	v.SetCondition(readyConditionName, status, reason, message)
}

// Set VirtualIPPool Configured Condition
func (v *ClusterConfig) SetVIPConfiguredCondition(status metav1.ConditionStatus, reason string, message string) {
	v.SetCondition(vIPConfiguredConditionName, status, reason, message)
}

// Set VirtualIPPool Ready Condition
func (v *ClusterConfig) SetVIPReadyCondition(status metav1.ConditionStatus, reason string, message string) {
	v.SetCondition(vIPReadyConditionName, status, reason, message)
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

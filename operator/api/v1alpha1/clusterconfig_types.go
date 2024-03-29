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
	"sync"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	wPVIPConfiguredConditionName = "WorkloadPlaneVirtualIPPool" + configuredConditionName
	wPVIPReadyConditionName      = "WorkloadPlaneVirtualIPPool" + readyConditionName

	cPIngressConfiguredConditionName    = "ControlPlaneIngress" + configuredConditionName
	cPIngressVIPConfiguredConditionName = "ControlPlaneIngressVirtualIP" + configuredConditionName
	cPIngressVIPReadyConditionName      = "ControlPlaneIngressVirtualIP" + readyConditionName
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

type ManagedVirtualIPSource struct {
	// and will be used to reach the Ingress
	// A Virtual IP address that will be managed by the Operator
	Address IPAddress `json:"address"`
}

type ExternalIPSource struct {
	// The IP address used to reach the Ingress
	Address IPAddress `json:"address"`
}

type ControlPlaneIngressSource struct {
	ManagedVirtualIP *ManagedVirtualIPSource `json:"managedVirtualIP,omitempty"`
	ExternalIP       *ExternalIPSource       `json:"externalIP,omitempty"`
}

type ControlPlaneIngressSpec struct {
	ControlPlaneIngressSource `json:",inline"`
}

type ControlPlaneSpec struct {
	// Information about the Control Plane Ingress
	Ingress ControlPlaneIngressSpec `json:"ingress,omitempty"`
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

	// Information about the Control Plane.
	// +optional
	ControlPlane ControlPlaneSpec `json:"controlPlane,omitempty"`

	// Information about the Workload Plane.
	// +optional
	WorkloadPlane WorkloadPlaneSpec `json:"workloadPlane,omitempty"`
}

type ControlPlaneIngressStatus struct {
	// The IP address where the Ingress is exposed
	IP IPAddress `json:"ip,omitempty"`
	// The full endpoint URL to reach the Ingress
	Endpoint string `json:"endpoint,omitempty"`
}

type ControlPlaneStatus struct {
	// Information about the Control Plane Ingress
	Ingress ControlPlaneIngressStatus `json:"ingress,omitempty"`
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

	// Control Plane Information
	ControlPlane ControlPlaneStatus `json:"controlPlane,omitempty"`
}

//+kubebuilder:object:root=true
//+kubebuilder:subresource:status
//+kubebuilder:resource:scope=Cluster,shortName=cc
//+kubebuilder:printcolumn:name="Control-Plane-Url",type="string",JSONPath=".status.controlPlane.ingress.endpoint",description="The URL to reach the Control Plane Ingress"

// ClusterConfig is the Schema for the clusterconfigs API
type ClusterConfig struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClusterConfigSpec   `json:"spec,omitempty"`
	Status ClusterConfigStatus `json:"status,omitempty"`
}

// The ClusterConfig is managed by several SubReconciler in parallel
// that may Set and Get conditions, so ensure there is always only one
// accessing it at once
// NOTE: We can have only one ClusterConfig so keep the mutex has a simple variable here
var mu sync.Mutex

// Set a condition on ClusterConfig
func (v *ClusterConfig) SetCondition(kind string, status metav1.ConditionStatus, reason string, message string) {
	mu.Lock()
	defer mu.Unlock()
	setCondition(v.Generation, &v.Status.Conditions, kind, status, reason, message)
}

// Get a condition from ClusterConfig
func (v *ClusterConfig) GetCondition(kind string) *Condition {
	mu.Lock()
	defer mu.Unlock()
	return getCondition(v.Status.Conditions, kind)
}

// Set Ready Condition
func (v *ClusterConfig) SetReadyCondition(status metav1.ConditionStatus, reason string, message string) {
	v.SetCondition(readyConditionName, status, reason, message)
}

// Set WorkloadPlaneVirtualIPPool Configured Condition
func (v *ClusterConfig) SetWPVIPConfiguredCondition(status metav1.ConditionStatus, reason string, message string) {
	v.SetCondition(wPVIPConfiguredConditionName, status, reason, message)
}

// Set WorkloadPlaneVirtualIPPool Ready Condition
func (v *ClusterConfig) SetWPVIPReadyCondition(status metav1.ConditionStatus, reason string, message string) {
	v.SetCondition(wPVIPReadyConditionName, status, reason, message)
}

// Set ControlPlaneIngressConfigured Condition
func (v *ClusterConfig) SetCPIngressConfiguredCondition(status metav1.ConditionStatus, reason string, message string) {
	v.SetCondition(cPIngressConfiguredConditionName, status, reason, message)
}

// Set ControlPlaneIngressVirtualIP Configured Condition
func (v *ClusterConfig) SetCPIngressVIPConfiguredCondition(status metav1.ConditionStatus, reason string, message string) {
	v.SetCondition(cPIngressVIPConfiguredConditionName, status, reason, message)
}

// Set ControlPlaneIngressVirtualIP Ready Condition
func (v *ClusterConfig) SetCPIngressVIPReadyCondition(status metav1.ConditionStatus, reason string, message string) {
	v.SetCondition(cPIngressVIPReadyConditionName, status, reason, message)
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

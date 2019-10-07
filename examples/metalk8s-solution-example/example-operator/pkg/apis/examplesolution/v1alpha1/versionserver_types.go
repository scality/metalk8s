package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// VersionServerSpec defines the desired state of VersionServer
// +k8s:openapi-gen=true
type VersionServerSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "operator-sdk generate k8s" to regenerate code after modifying this file
	// Add custom validation using kubebuilder tags: https://book-v1.book.kubebuilder.io/beyond_basics/generating_crd.html

	// +kubebuilder:validation:Minimum=1
	// Number of Pods to run for this VersionServer
	Replicas int32 `json:"replicas"`

	// The version of the container image to run
	Version string `json:"version"`
}

// VersionServerStatus defines the observed state of VersionServer
// +k8s:openapi-gen=true
type VersionServerStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "operator-sdk generate k8s" to regenerate code after modifying this file
	// Add custom validation using kubebuilder tags: https://book-v1.book.kubebuilder.io/beyond_basics/generating_crd.html
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// VersionServer is the Schema for the examples API
// +k8s:openapi-gen=true
// +kubebuilder:subresource:status
type VersionServer struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   VersionServerSpec   `json:"spec,omitempty"`
	Status VersionServerStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// VersionServerList contains a list of VersionServer
type VersionServerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []VersionServer `json:"items"`
}

func init() {
	SchemeBuilder.Register(&VersionServer{}, &VersionServerList{})
}

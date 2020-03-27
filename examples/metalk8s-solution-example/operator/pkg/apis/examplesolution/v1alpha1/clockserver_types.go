package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// ClockServerSpec defines the desired state of ClockServer
// +k8s:openapi-gen=true
type ClockServerSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "operator-sdk generate k8s" to regenerate code after modifying this file
	// Add custom validation using kubebuilder tags: https://book-v1.book.kubebuilder.io/beyond_basics/generating_crd.html

	// Timezone for this clock, in the format UTC[+/-]HH:MM
	Timezone string `json:"timezone"`

	// The version of the container image to run
	Version string `json:"version"`
}

// ClockServerStatus defines the observed state of ClockServer
// +k8s:openapi-gen=true
type ClockServerStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "operator-sdk generate k8s" to regenerate code after modifying this file
	// Add custom validation using kubebuilder tags: https://book-v1.book.kubebuilder.io/beyond_basics/generating_crd.html
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// ClockServer is the Schema for the clockservers API
// +k8s:openapi-gen=true
// +kubebuilder:subresource:status
type ClockServer struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ClockServerSpec   `json:"spec,omitempty"`
	Status ClockServerStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// ClockServerList contains a list of ClockServer
type ClockServerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ClockServer `json:"items"`
}

func init() {
	SchemeBuilder.Register(&ClockServer{}, &ClockServerList{})
}

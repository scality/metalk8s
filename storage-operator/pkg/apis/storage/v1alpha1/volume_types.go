package v1alpha1

import (
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

type SparseLoopDeviceVolumeSource struct {
	// Size of the generated sparse file backing the PersistentVolume.
	Size resource.Quantity `json:"size"`
}

type RawBlockDeviceVolumeSource struct {
	// Path of the block device on the node to back the PersistentVolume.
	DevicePath string `json:"devicePath"`
}

type VolumeSource struct {
	SparseLoopDevice *SparseLoopDeviceVolumeSource `json:"sparseLoopDevice,omitempty"`
	RawBlockDevice   *RawBlockDeviceVolumeSource   `json:"rawBlockDevice,omitempty"`
}

// VolumeSpec defines the desired state of Volume
// +k8s:openapi-gen=true
type VolumeSpec struct {
	// INSERT ADDITIONAL SPEC FIELDS - desired state of cluster
	// Important: Run "operator-sdk generate k8s" to regenerate code after modifying this file
	// Add custom validation using kubebuilder tags: https://book-v1.book.kubebuilder.io/beyond_basics/generating_crd.html

	// Name of the node on which the volume is available.
	NodeName types.NodeName `json:"nodeName"`

	// Name of the StorageClass that gets assigned to the volume. Also, any
	// mount options are copied from the StorageClass to the
	// PersistentVolume if present.
	StorageClassName string `json:"storageClassName"`

	VolumeSource `json:",inline"`
}

// VolumeStatus defines the observed state of Volume
// +k8s:openapi-gen=true
type VolumeStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "operator-sdk generate k8s" to regenerate code after modifying this file
	// Add custom validation using kubebuilder tags: https://book-v1.book.kubebuilder.io/beyond_basics/generating_crd.html
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// Volume is the Schema for the volumes API
// +k8s:openapi-gen=true
// +kubebuilder:subresource:status
// +genclient:nonNamespaced
// +kubebuilder:printcolumn:name="Node",type="string",JSONPath=".spec.nodeName",description="The node on which the volume is available"
// +kubebuilder:printcolumn:name="StorageClass",type="string",JSONPath=".spec.storageClassName",description="The storage class of the volume"
type Volume struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   VolumeSpec   `json:"spec,omitempty"`
	Status VolumeStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// VolumeList contains a list of Volume
type VolumeList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Volume `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Volume{}, &VolumeList{})
}

package v1alpha1

import (
	"errors"
	"fmt"

	corev1 "k8s.io/api/core/v1"
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

	// Template for the underlying PersistentVolume.
	// +optional
	Template PersistentVolumeTemplateSpec `json:"template,omitempty"`

	VolumeSource `json:",inline"`
}

// Describes the PersistentVolume that will be created to back the Volume.
// +k8s:openapi-gen=true
type PersistentVolumeTemplateSpec struct {
	// Standard object's metadata.
	// +optional
	Metadata metav1.ObjectMeta `json:"metadata,omitempty"`
	// Specification of the Persistent Volume.
	// +optional
	Spec corev1.PersistentVolumeSpec `json:"spec,omitempty"`
}

type VolumePhase string

// TODO: kept for temporary compatibility, to be removed.
// "Enum" representing the phase of a volume.
const (
	VolumeFailed      VolumePhase = "Failed"
	VolumePending     VolumePhase = "Pending"
	VolumeAvailable   VolumePhase = "Available"
	VolumeTerminating VolumePhase = "Terminating"
)

type ConditionReason string

// TODO: replace those by more fine-grained ones.
// "Enum" representing the error codes of the Failed state.
const (
	InternalError    ConditionReason = "InternalError"
	CreationError    ConditionReason = "CreationError"
	DestructionError ConditionReason = "DestructionError"
	UnavailableError ConditionReason = "UnavailableError"
)

type VolumeConditionType string

const (
	// VolumeReady means Volume is ready to be used.
	VolumeReady VolumeConditionType = "Ready"
)

type VolumeCondition struct {
	// Type of volume condition.
	Type VolumeConditionType `json:"type"`
	// Status of the condition, one of True, False, Unknown.
	Status corev1.ConditionStatus `json:"status"`
	// Last time the condition was updated (optional).
	LastUpdateTime metav1.Time `json:"lastUpdateTime,omitempty"`
	// Last time the condition transited from one status to another (optional).
	LastTransitionTime metav1.Time `json:"lastTransitionTime,omitempty"`
	// Unique, one-word, CamelCase reason for the condition's last transition.
	Reason ConditionReason `json:"reason,omitempty"`
	// Human readable message indicating details about last transition.
	Message string `json:"message,omitempty"`
}

// VolumeStatus defines the observed state of Volume
// +k8s:openapi-gen=true
type VolumeStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "operator-sdk generate k8s" to regenerate code after modifying this file
	// Add custom validation using kubebuilder tags: https://book-v1.book.kubebuilder.io/beyond_basics/generating_crd.html

	// List of conditions through which the Volume has or has not passed.
	// +kubebuilder:validation:Enum=Available,Pending,Failed,Terminating
	Conditions []VolumeCondition `json:"conditions,omitempty"`

	// Job in progress
	Job string `json:"job,omitempty"`
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

// Update the volume status to Failed phase.
//
// Arguments
//     errorCode: the error code that triggered the shift to the Failed phase
//     format:    the string format for the error message
//     args:      values used in the error message
func (self *Volume) SetFailedStatus(
	errorCode VolumeErrorCode, format string, args ...interface{},
) {
	errorMsg := fmt.Sprintf(format, args...)

	self.Status = VolumeStatus{
		Phase:        VolumeFailed,
		Job:          self.Status.Job, // Preserve job: can help for debug.
		ErrorCode:    errorCode,
		ErrorMessage: errorMsg,
	}
}

// Update the volume status to Pending phase.
//
// Arguments
//     job: job in progress
func (self *Volume) SetPendingStatus(job string) {
	self.Status = VolumeStatus{
		Phase: VolumePending, Job: job, ErrorCode: "", ErrorMessage: "",
	}
}

// Update the volume status to Available phase.
func (self *Volume) SetAvailableStatus() {
	self.Status = VolumeStatus{
		Phase: VolumeAvailable, Job: "", ErrorCode: "", ErrorMessage: "",
	}
}

// Update the volume status to Terminating phase.
//
// Arguments
//     job: job in progress
func (self *Volume) SetTerminatingStatus(job string) {
	self.Status = VolumeStatus{
		Phase: VolumeTerminating, Job: job, ErrorCode: "", ErrorMessage: "",
	}
}

// Check if a volume is valid.
func (self *Volume) IsValid() error {
	// Check if a type is specified.
	if self.Spec.SparseLoopDevice == nil &&
		self.Spec.RawBlockDevice == nil {
		return errors.New("volume type not found in Volume Spec")
	}
	// Check if the size is strictly positive.
	if self.Spec.SparseLoopDevice != nil {
		if self.Spec.SparseLoopDevice.Size.Sign() <= 0 {
			return fmt.Errorf(
				"invalid SparseLoopDevice size (should be greater than 0): %s",
				self.Spec.SparseLoopDevice.Size.String(),
			)
		}
	}

	return nil
}

// Check if a volume is in an unrecoverable state.
func (self *Volume) IsInUnrecoverableFailedState() bool {
	// Only `UnavailableError` is recoverable.
	return self.Status.Phase == VolumeFailed &&
		self.Status.ErrorCode != UnavailableError
}

// Return the volume path on the node.
func (self *Volume) GetPath() string {
	return fmt.Sprintf("/dev/disk/by-uuid/%s", self.UID)
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

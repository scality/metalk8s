package v1alpha1

import (
	"errors"
	"fmt"

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

type VolumePhase string

// "Enum" representing the phase/status of a volume.
const (
	VolumeFailed      VolumePhase = "Failed"
	VolumePending     VolumePhase = "Pending"
	VolumeAvailable   VolumePhase = "Available"
	VolumeTerminating VolumePhase = "Terminating"
)

type VolumeErrorCode string

// "Enum" representing the error codes of the Failed state.
const (
	InternalError    VolumeErrorCode = "InternalError"
	CreationError    VolumeErrorCode = "CreationError"
	DestructionError VolumeErrorCode = "DestructionError"
	UnavailableError VolumeErrorCode = "UnavailableError"
)

// VolumeStatus defines the observed state of Volume
// +k8s:openapi-gen=true
type VolumeStatus struct {
	// INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "operator-sdk generate k8s" to regenerate code after modifying this file
	// Add custom validation using kubebuilder tags: https://book-v1.book.kubebuilder.io/beyond_basics/generating_crd.html

	// Volume lifecycle phase
	// +kubebuilder:validation:Enum=Available,Pending,Failed,Terminating
	Phase VolumePhase `json:"phase,omitempty"`

	// Job in progress
	Job string `json:"job,omitempty"`

	// Volume failure error code
	// +kubebuilder:validation:Enum=InternalError,CreationError,DestructionError,UnavailableError
	ErrorCode VolumeErrorCode `json:"errorCode,omitempty"`

	// Volume failure error message
	ErrorMessage string `json:"errorMessage,omitempty"`
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

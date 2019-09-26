package v1alpha1

import (
	"testing"

	"github.com/stretchr/testify/assert"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestGetCondition(t *testing.T) {
	now := metav1.Now()
	tests := map[string]struct {
		conditions         VolumeCondition
		condType           VolumeConditionType
		condStatus         corev1.ConditionStatus
		insertExpected     bool
		transitionExpected bool
	}{
		"AddCondition": {
			conditions: VolumeCondition{
				Type:               VolumeReady,
				Status:             corev1.ConditionTrue,
				LastUpdateTime:     now,
				LastTransitionTime: now,
				Reason:             "Foo",
				Message:            "Bar",
			},
			condType:           "whatever",
			condStatus:         corev1.ConditionFalse,
			insertExpected:     true,
			transitionExpected: true,
		},
		"UpdateConditionNoTransition": {
			conditions: VolumeCondition{
				Type:               VolumeReady,
				Status:             corev1.ConditionTrue,
				LastUpdateTime:     now,
				LastTransitionTime: now,
				Reason:             "Foo",
				Message:            "Bar",
			},
			condType:           VolumeReady,
			condStatus:         corev1.ConditionTrue,
			insertExpected:     false,
			transitionExpected: false,
		},
		"Found": {
			conditions: VolumeCondition{
				Type:               VolumeReady,
				Status:             corev1.ConditionTrue,
				LastUpdateTime:     now,
				LastTransitionTime: now,
				Reason:             "Foo",
				Message:            "Bar",
			},
			condType:           VolumeReady,
			condStatus:         corev1.ConditionFalse,
			insertExpected:     false,
			transitionExpected: true,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			volume := Volume{
				Status: VolumeStatus{
					Conditions: []VolumeCondition{tc.conditions},
				},
			}
			oldLen := len(volume.Status.Conditions)

			volume.SetCondition(tc.condType, tc.condStatus, "Baz", "Qux")

			condition := volume.GetCondition(tc.condType)
			if tc.insertExpected {
				assert.True(t, len(volume.Status.Conditions) > oldLen)
			} else {
				assert.Equal(t, oldLen, len(volume.Status.Conditions))
			}

			if tc.transitionExpected {
				assert.True(t, now.Before(&condition.LastTransitionTime))
			} else {
				assert.Equal(t, now, condition.LastTransitionTime)
			}

			assert.Equal(t, tc.condType, condition.Type)
			assert.Equal(t, tc.condStatus, condition.Status)
			assert.True(t, now.Before(&condition.LastUpdateTime))
			assert.Equal(t, ConditionReason("Baz"), condition.Reason)
			assert.Equal(t, "Qux", condition.Message)
		})
	}
}

func TestComputePhase(t *testing.T) {
	tests := map[string]struct {
		kind     VolumeConditionType
		status   corev1.ConditionStatus
		reason   ConditionReason
		expected VolumePhase
	}{
		"Unknown": {
			kind:     "nope",
			status:   corev1.ConditionTrue,
			reason:   "",
			expected: "",
		},
		"Available": {
			kind:     VolumeReady,
			status:   corev1.ConditionTrue,
			reason:   "",
			expected: VolumeAvailable,
		},
		"Failed": {
			kind:     VolumeReady,
			status:   corev1.ConditionFalse,
			reason:   "",
			expected: VolumeFailed,
		},
		"Pending": {
			kind:     VolumeReady,
			status:   corev1.ConditionUnknown,
			reason:   "Pending",
			expected: VolumePending,
		},
		"Terminating": {
			kind:     VolumeReady,
			status:   corev1.ConditionUnknown,
			reason:   "Terminating",
			expected: VolumeTerminating,
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			volume := Volume{
				Status: VolumeStatus{
					Conditions: []VolumeCondition{{
						Type:   tc.kind,
						Status: tc.status,
						Reason: tc.reason,
					}},
				},
			}
			phase := volume.ComputePhase()

			assert.Equal(t, tc.expected, phase)
		})
	}
}

func TestIsInUnrecoverableFailedState(t *testing.T) {
	tests := map[string]struct {
		kind     VolumeConditionType
		status   corev1.ConditionStatus
		reason   ConditionReason
		message  string
		expected *VolumeCondition
	}{
		"Unknown": {
			kind:     "nope",
			status:   corev1.ConditionTrue,
			reason:   "",
			message:  "",
			expected: nil,
		},
		"Success": {
			kind:     VolumeReady,
			status:   corev1.ConditionTrue,
			reason:   "",
			message:  "",
			expected: nil,
		},
		"TransientError": {
			kind:     VolumeReady,
			status:   corev1.ConditionFalse,
			reason:   ReasonUnavailableError,
			message:  "",
			expected: nil,
		},
		"DefinitiveError": {
			kind:    VolumeReady,
			status:  corev1.ConditionFalse,
			reason:  ReasonCreationError,
			message: "KABOOM",
			expected: &VolumeCondition{
				Reason:  ReasonCreationError,
				Message: "KABOOM",
			},
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			volume := Volume{
				Status: VolumeStatus{
					Conditions: []VolumeCondition{{
						Type:    tc.kind,
						Status:  tc.status,
						Reason:  tc.reason,
						Message: tc.message,
					}},
				},
			}
			condition := volume.IsInUnrecoverableFailedState()

			if tc.expected == nil {
				assert.Nil(t, condition)
			} else {
				assert.Equal(t, tc.expected.Reason, condition.Reason)
				assert.Equal(t, tc.expected.Message, condition.Message)
			}
		})
	}
}

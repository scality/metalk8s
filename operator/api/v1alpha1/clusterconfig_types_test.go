package v1alpha1

import (
	"testing"

	"github.com/stretchr/testify/assert"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestGetSetCondition(t *testing.T) {
	now := metav1.Now()
	tests := map[string]struct {
		conditions         metav1.Condition
		condType           string
		condStatus         metav1.ConditionStatus
		insertExpected     bool
		transitionExpected bool
		skipSet            bool
		notFoundExpected   bool
	}{
		"AddCondition": {
			conditions: metav1.Condition{
				Type:               "MyCondition",
				Status:             metav1.ConditionTrue,
				ObservedGeneration: 12,
				LastTransitionTime: now,
				Reason:             "Foo",
				Message:            "Bar",
			},
			condType:           "whatever",
			condStatus:         metav1.ConditionFalse,
			insertExpected:     true,
			transitionExpected: true,
		},
		"UpdateConditionNoTransition": {
			conditions: metav1.Condition{
				Type:               "MyCondition",
				Status:             metav1.ConditionTrue,
				ObservedGeneration: 12,
				LastTransitionTime: now,
				Reason:             "Foo",
				Message:            "Bar",
			},
			condType:           "MyCondition",
			condStatus:         metav1.ConditionTrue,
			insertExpected:     false,
			transitionExpected: false,
		},
		"Found": {
			conditions: metav1.Condition{
				Type:               "MyCondition",
				Status:             metav1.ConditionTrue,
				ObservedGeneration: 12,
				LastTransitionTime: now,
				Reason:             "Foo",
				Message:            "Bar",
			},
			condType:           "MyCondition",
			condStatus:         metav1.ConditionFalse,
			insertExpected:     false,
			transitionExpected: true,
		},
		"NotFound": {
			conditions: metav1.Condition{
				Type:               "MyCondition",
				Status:             metav1.ConditionTrue,
				ObservedGeneration: 12,
				LastTransitionTime: now,
				Reason:             "Foo",
				Message:            "Bar",
			},
			condType:         "UnknownCondition",
			condStatus:       metav1.ConditionFalse,
			skipSet:          true,
			notFoundExpected: true,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			clusterConfig := ClusterConfig{
				Status: ClusterConfigStatus{
					Conditions: []metav1.Condition{tc.conditions},
				},
			}
			oldLen := len(clusterConfig.Status.Conditions)

			if !tc.skipSet {
				clusterConfig.SetCondition(tc.condType, tc.condStatus, "Baz", "Qux")
			}

			condition := clusterConfig.GetCondition(tc.condType)
			if tc.insertExpected {
				assert.True(t, len(clusterConfig.Status.Conditions) > oldLen)
			} else {
				assert.Equal(t, oldLen, len(clusterConfig.Status.Conditions))
			}

			if tc.notFoundExpected {
				assert.Nil(t, condition)
			} else {
				if tc.transitionExpected {
					assert.True(t, now.Before(&condition.LastTransitionTime))
				} else {
					assert.Equal(t, now, condition.LastTransitionTime)
				}
				assert.Equal(t, tc.condType, condition.Type)
				assert.Equal(t, tc.condStatus, condition.Status)
				assert.Equal(t, "Baz", condition.Reason)
				assert.Equal(t, "Qux", condition.Message)
			}
		})
	}
}

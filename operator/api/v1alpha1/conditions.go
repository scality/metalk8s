package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const (
	// Configured mean that all the Objects has been updated has expected
	configuredConditionName = "Configured"
	// Available mean that the service is available and can be used
	// but maybe not yet highly avaiable (e.g.: at least one replicas is ready)
	availableConditionName = "Available"
	// Ready mean that the service is fully ready and available
	// (e.g.: all the replicas are ready)
	readyConditionName = "Ready"
)

// Condition contains details for one aspect of the current state of this object
type Condition metav1.Condition

// Set a condition.
//
// If a condition of this type already exists it is updated, otherwise a new
// condition is added.
func setCondition(
	gen int64,
	conditions *[]Condition,
	kind string,
	status metav1.ConditionStatus,
	reason string,
	message string,
) {
	condition := Condition{
		Type:               kind,
		Status:             status,
		ObservedGeneration: gen,
		LastTransitionTime: metav1.Now(),
		Reason:             reason,
		Message:            message,
	}

	for idx, cond := range *conditions {
		if cond.Type == kind {
			// Don't update timestamps if status hasn't changed.
			if cond.Status == condition.Status {
				condition.LastTransitionTime = cond.LastTransitionTime
			}
			(*conditions)[idx] = condition
			return
		}
	}
	*conditions = append(*conditions, condition)
}

// Get the condition identified by `kind`.
//
// Return `nil` if no such condition exists.
func getCondition(conditions []Condition, kind string) *Condition {
	for _, cond := range conditions {
		if cond.Type == kind {
			return &cond
		}
	}
	return nil
}

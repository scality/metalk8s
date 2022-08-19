package utils

import (
	"time"

	ctrl "sigs.k8s.io/controller-runtime"
)

// Trigger a reschedule after a short delay.
func DelayedRequeue() (ctrl.Result, error) {
	delay := 10 * time.Second
	return ctrl.Result{Requeue: true, RequeueAfter: delay}, nil
}

// Trigger a reschedule as soon as possible.
func Requeue(err error) (ctrl.Result, error) {
	return ctrl.Result{Requeue: err == nil}, err
}

// Don't trigger a reschedule, we're done.
func EndReconciliation() (ctrl.Result, error) {
	return ctrl.Result{}, nil
}

package utils

import (
	"fmt"
	"time"

	ctrl "sigs.k8s.io/controller-runtime"
)

type reconcilerStatus int

const (
	nothingToDo reconcilerStatus = iota
	requeue
	delayRequeue
	endReconcile
)

type ReconcilerResult struct {
	status reconcilerStatus
	err    error
}

func newReconcilerResult(status reconcilerStatus, err error) ReconcilerResult {
	return ReconcilerResult{
		status: status,
		err:    err,
	}
}

// Nothing to do, reconcilitation can continue
func NothingToDo() ReconcilerResult {
	return newReconcilerResult(nothingToDo, nil)
}

// A requeue is needed
func Requeue(err error) ReconcilerResult {
	return newReconcilerResult(requeue, err)
}

// A delayed requeue is needed
func DelayedRequeue() ReconcilerResult {
	return newReconcilerResult(delayRequeue, nil)
}

// End the reconciliation
func EndReconciliation() ReconcilerResult {
	return newReconcilerResult(endReconcile, nil)
}

// Return wether or not the main Reconcile function should return
func (r ReconcilerResult) ShouldReturn() bool {
	return r.status != nothingToDo
}

// Get the Return for the main Reconcile function
func (r ReconcilerResult) GetResult() (ctrl.Result, error) {
	switch r.status {
	case requeue:
		return ctrl.Result{Requeue: r.err == nil}, r.err
	case delayRequeue:
		delay := 10 * time.Second
		return ctrl.Result{Requeue: true, RequeueAfter: delay}, nil
	case endReconcile:
		return ctrl.Result{}, nil
	default:
		// Internal error, shouldn't happen
		return ctrl.Result{}, fmt.Errorf("internal error, got an invalid Reconciler status: %d, %v", r.status, r.err)
	}
}

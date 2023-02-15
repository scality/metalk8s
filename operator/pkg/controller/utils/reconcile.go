package utils

import (
	"context"
	"fmt"
	"time"

	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/go-logr/logr"
	metalk8sscalitycomv1alpha1 "github.com/scality/metalk8s/operator/api/v1alpha1"
)

// Interface for all SubReconciler
type SubReconciler interface {
	Load(*ObjectHandler, logr.Logger, *metalk8sscalitycomv1alpha1.ClusterConfig)
	GetLogger() logr.Logger
	Reconcile(context.Context) SubReconcilerResult
}

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

// SubReconciler is used when you have multiple different reconcile loop in
// a single controller
// So that each sub reconcile function can return whether or not the main reconcile
// loop should return now or not
type subReconcilerStatus int

const (
	// NOTE: They are ordered by priority, if we get a `endReconcile` it means that
	// a requeue will happens so trigger this instead of an explicit requeue
	nothingToDo subReconcilerStatus = iota
	delayRequeue
	requeue
	endReconcile
)

type SubReconcilerResult struct {
	status subReconcilerStatus
	err    error
}

func newSubReconcilerResult(status subReconcilerStatus, err error) SubReconcilerResult {
	return SubReconcilerResult{
		status: status,
		err:    err,
	}
}

// Nothing to do, reconcilitation can continue
func NothingToDo() SubReconcilerResult {
	return newSubReconcilerResult(nothingToDo, nil)
}

// A delayed requeue is needed
func NeedDelayedRequeue() SubReconcilerResult {
	return newSubReconcilerResult(delayRequeue, nil)
}

// A requeue is needed
func NeedRequeue(err error) SubReconcilerResult {
	return newSubReconcilerResult(requeue, err)
}

// End the reconciliation
func NeedEndReconciliation() SubReconcilerResult {
	return newSubReconcilerResult(endReconcile, nil)
}

// Return wether or not the main Reconcile function should return
func (r SubReconcilerResult) ShouldReturn() bool {
	return r.status != nothingToDo
}

// Compare if it's more important result
func (r SubReconcilerResult) IsSuperior(r2 SubReconcilerResult) bool {
	return r.status > r2.status
}

// Get the Return for the main Reconcile function
func (r SubReconcilerResult) GetResult() (ctrl.Result, error) {
	switch r.status {
	case delayRequeue:
		return DelayedRequeue()
	case requeue:
		return Requeue(r.err)
	case endReconcile:
		return EndReconciliation()
	default:
		// Internal error, shouldn't happen
		return ctrl.Result{}, fmt.Errorf("internal error, got an invalid Reconciler status: %d, %v", r.status, r.err)
	}
}

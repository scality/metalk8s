package utils_test

import (
	"fmt"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/scality/metalk8s/operator/pkg/controller/utils"
)

var _ = Describe("Reconcile output test", func() {
	Describe("DelayedRequeue", func() {
		It("return a delayed requeue result", func() {
			assertDelayedRequeue(utils.DelayedRequeue())
		})
	})

	Describe("Requeue", func() {
		It("return a requeue result", func() {
			assertRequeue(utils.Requeue(nil))
		})

		It("report error", func() {
			myErr := fmt.Errorf("An ErRoR !")
			result, err := utils.Requeue(myErr)

			assertRequeueError(myErr, result, err)
		})
	})

	Describe("EndReconciliation", func() {
		It("return a end reconciliation result", func() {
			assertEndReconciliation(utils.EndReconciliation())
		})
	})
})

var _ = Describe("SubReconciler tests", func() {
	Describe("NothingToDo", func() {
		It("return that there is nothing to do", func() {
			r := utils.NothingToDo()

			Expect(r.ShouldReturn()).To(BeFalse())

			_, err := r.GetResult()
			Expect(err).To(HaveOccurred())
		})

		It("is not superior to anything", func() {
			r := utils.NothingToDo()

			Expect(r.IsSuperior(utils.NothingToDo())).To(BeFalse())
			Expect(r.IsSuperior(utils.NeedDelayedRequeue())).To(BeFalse())
			Expect(r.IsSuperior(utils.NeedRequeue(nil))).To(BeFalse())
			Expect(r.IsSuperior(utils.NeedEndReconciliation())).To(BeFalse())
		})
	})

	Describe("NeedDelayedRequeue", func() {
		It("return a delayed requeue", func() {
			r := utils.NeedDelayedRequeue()

			Expect(r.ShouldReturn()).To(BeTrue())

			assertDelayedRequeue(r.GetResult())
		})

		It("is only superior to NothingToDo", func() {
			r := utils.NeedDelayedRequeue()

			Expect(r.IsSuperior(utils.NothingToDo())).To(BeTrue())
			Expect(r.IsSuperior(utils.NeedDelayedRequeue())).To(BeFalse())
			Expect(r.IsSuperior(utils.NeedRequeue(nil))).To(BeFalse())
			Expect(r.IsSuperior(utils.NeedEndReconciliation())).To(BeFalse())
		})
	})

	Describe("NeedRequeue", func() {
		It("return a requeue", func() {
			r := utils.NeedRequeue(nil)

			Expect(r.ShouldReturn()).To(BeTrue())

			assertRequeue(r.GetResult())
		})

		It("report error", func() {
			myErr := fmt.Errorf("An ErRoR !")
			r := utils.NeedRequeue(myErr)

			Expect(r.ShouldReturn()).To(BeTrue())

			result, err := r.GetResult()
			assertRequeueError(myErr, result, err)
		})

		It("is only superior to NothingToDo and NeedDelayedRequeue", func() {
			r := utils.NeedRequeue(nil)

			Expect(r.IsSuperior(utils.NothingToDo())).To(BeTrue())
			Expect(r.IsSuperior(utils.NeedDelayedRequeue())).To(BeTrue())
			Expect(r.IsSuperior(utils.NeedRequeue(nil))).To(BeFalse())
			Expect(r.IsSuperior(utils.NeedEndReconciliation())).To(BeFalse())
		})
	})

	Describe("NeedEndReconciliation", func() {
		It("return an end reconciliation", func() {
			r := utils.NeedEndReconciliation()

			Expect(r.ShouldReturn()).To(BeTrue())

			assertEndReconciliation(r.GetResult())
		})

		It("is superior to everything", func() {
			r := utils.NeedEndReconciliation()

			Expect(r.IsSuperior(utils.NothingToDo())).To(BeTrue())
			Expect(r.IsSuperior(utils.NeedDelayedRequeue())).To(BeTrue())
			Expect(r.IsSuperior(utils.NeedRequeue(nil))).To(BeTrue())
			Expect(r.IsSuperior(utils.NeedEndReconciliation())).To(BeFalse())
		})
	})
})

func assertDelayedRequeue(result ctrl.Result, err error) {
	Expect(err).ToNot(HaveOccurred())
	Expect(result.Requeue).To(BeTrue())
	Expect(result.RequeueAfter).To(BeNumerically(">", 0))
}

func assertRequeue(result ctrl.Result, err error) {
	Expect(err).ToNot(HaveOccurred())
	Expect(result.Requeue).To(BeTrue())
	Expect(result.RequeueAfter).To(BeZero())
}

func assertRequeueError(myErr error, result ctrl.Result, err error) {
	Expect(err).To(HaveOccurred())
	Expect(err).To(BeEquivalentTo(myErr))
	Expect(result.Requeue).To(BeFalse())
	Expect(result.RequeueAfter).To(BeZero())
}

func assertEndReconciliation(result ctrl.Result, err error) {
	Expect(err).ToNot(HaveOccurred())
	Expect(result.Requeue).To(BeFalse())
	Expect(result.RequeueAfter).To(BeZero())
}

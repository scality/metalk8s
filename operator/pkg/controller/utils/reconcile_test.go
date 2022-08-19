package utils_test

import (
	"fmt"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"

	"github.com/scality/metalk8s/operator/pkg/controller/utils"
)

var _ = Describe("Reconcile output test", func() {
	Describe("DelayedRequeue", func() {
		It("return a delayed requeue result", func() {
			result, err := utils.DelayedRequeue()

			Expect(err).ToNot(HaveOccurred())
			Expect(result.Requeue).To(BeTrue())
			Expect(result.RequeueAfter).To(BeNumerically(">", 0))
		})
	})

	Describe("Requeue", func() {
		It("return a requeue result", func() {
			result, err := utils.Requeue(nil)

			Expect(err).ToNot(HaveOccurred())
			Expect(result.Requeue).To(BeTrue())
			Expect(result.RequeueAfter).To(BeZero())
		})

		It("report error", func() {
			myErr := fmt.Errorf("An ErRoR !")
			result, err := utils.Requeue(myErr)

			Expect(err).To(HaveOccurred())
			Expect(err.Error()).To(Equal("An ErRoR !"))
			Expect(result.Requeue).To(BeFalse())
			Expect(result.RequeueAfter).To(BeZero())
		})
	})

	Describe("EndReconciliation", func() {
		It("return a end reconciliation result", func() {
			result, err := utils.EndReconciliation()

			Expect(err).ToNot(HaveOccurred())
			Expect(result.Requeue).To(BeFalse())
			Expect(result.RequeueAfter).To(BeZero())
		})
	})
})

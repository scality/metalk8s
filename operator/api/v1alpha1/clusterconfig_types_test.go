package v1alpha1_test

import (
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	metalk8sscalitycomv1alpha1 "github.com/scality/metalk8s/operator/api/v1alpha1"
)

var _ = Describe("ClusterConfig", func() {
	Describe("GetSetCondition", func() {
		It("can add and get a condition", func() {
			now := metav1.Now()
			c := metalk8sscalitycomv1alpha1.ClusterConfig{
				ObjectMeta: metav1.ObjectMeta{Generation: 12},
			}

			c.SetCondition("MyCondition", metav1.ConditionTrue, "Foo", "Bar")

			cond := c.GetCondition("MyCondition")
			Expect(cond.Type).To(Equal("MyCondition"))
			Expect(cond.Status).To(Equal(metav1.ConditionTrue))
			Expect(cond.ObservedGeneration).To(BeEquivalentTo(12))
			Expect(cond.LastTransitionTime.Time).To(BeTemporally(">", now.Time))
			Expect(cond.Reason).To(Equal("Foo"))
			Expect(cond.Message).To(Equal("Bar"))
		})
	})
})

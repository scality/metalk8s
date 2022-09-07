package v1alpha1

import (
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var _ = Describe("ClusterConfig", func() {
	Describe("GetSetCondition", func() {
		It("can add and get a condition", func() {
			now := metav1.Now()
			c := ClusterConfig{
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

	Describe("ReadyCondition", func() {
		It("can set Ready condition", func() {
			now := metav1.Now()
			c := ClusterConfig{
				ObjectMeta: metav1.ObjectMeta{Generation: 12},
			}

			c.SetReadyCondition(metav1.ConditionTrue, "Foo", "Bar")

			cond := c.GetCondition(readyConditionName)
			Expect(cond.Type).To(Equal(readyConditionName))
			Expect(cond.Status).To(Equal(metav1.ConditionTrue))
			Expect(cond.ObservedGeneration).To(BeEquivalentTo(12))
			Expect(cond.LastTransitionTime.Time).To(BeTemporally(">", now.Time))
			Expect(cond.Reason).To(Equal("Foo"))
			Expect(cond.Message).To(Equal("Bar"))
		})
	})

	Describe("VIPConfiguredCondition", func() {
		It("can set VIP Configured condition", func() {
			now := metav1.Now()
			c := ClusterConfig{
				ObjectMeta: metav1.ObjectMeta{Generation: 12},
			}

			c.SetVIPConfiguredCondition(metav1.ConditionTrue, "Foo", "Bar")

			cond := c.GetCondition(vIPConfiguredConditionName)
			Expect(cond.Type).To(Equal(vIPConfiguredConditionName))
			Expect(cond.Status).To(Equal(metav1.ConditionTrue))
			Expect(cond.ObservedGeneration).To(BeEquivalentTo(12))
			Expect(cond.LastTransitionTime.Time).To(BeTemporally(">", now.Time))
			Expect(cond.Reason).To(Equal("Foo"))
			Expect(cond.Message).To(Equal("Bar"))
		})
	})
})

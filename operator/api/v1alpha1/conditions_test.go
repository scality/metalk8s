package v1alpha1

import (
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var _ = Describe("Conditions manager", func() {
	Describe("GetSetCondition", func() {
		It("can add a new condition", func() {
			now := metav1.Now().Add(-time.Millisecond)
			conditions := []Condition{{}}

			setCondition(12, &conditions, "MyCondition", metav1.ConditionTrue, "Foo", "Bar")

			c := getCondition(conditions, "MyCondition")
			Expect(c.Type).To(Equal("MyCondition"))
			Expect(c.Status).To(Equal(metav1.ConditionTrue))
			Expect(c.ObservedGeneration).To(BeEquivalentTo(12))
			Expect(c.LastTransitionTime.Time).To(BeTemporally(">", now))
			Expect(c.Reason).To(Equal("Foo"))
			Expect(c.Message).To(Equal("Bar"))
		})

		It("can update an existing condition", func() {
			now := metav1.Now().Add(-time.Millisecond)
			conditions := []Condition{{
				Type:               "MyCondition",
				Status:             metav1.ConditionTrue,
				ObservedGeneration: 12,
				LastTransitionTime: metav1.NewTime(now),
				Reason:             "Foo",
				Message:            "Bar",
			}}

			setCondition(15, &conditions, "MyCondition", metav1.ConditionFalse, "Abc", "Def")

			c := getCondition(conditions, "MyCondition")
			Expect(c.Type).To(Equal("MyCondition"))
			Expect(c.Status).To(Equal(metav1.ConditionFalse))
			Expect(c.ObservedGeneration).To(BeEquivalentTo(15))
			Expect(c.LastTransitionTime.Time).To(BeTemporally(">", now))
			Expect(c.Reason).To(Equal("Abc"))
			Expect(c.Message).To(Equal("Def"))
		})

		It("do not update transition time if does not transition", func() {
			now := metav1.Now()
			conditions := []Condition{{
				Type:               "MyCondition",
				Status:             metav1.ConditionTrue,
				ObservedGeneration: 12,
				LastTransitionTime: now,
				Reason:             "Foo",
				Message:            "Bar",
			}}

			setCondition(15, &conditions, "MyCondition", metav1.ConditionTrue, "Abc", "Def")

			c := getCondition(conditions, "MyCondition")
			Expect(c.Type).To(Equal("MyCondition"))
			Expect(c.Status).To(Equal(metav1.ConditionTrue))
			Expect(c.ObservedGeneration).To(BeEquivalentTo(15))
			Expect(c.LastTransitionTime).To(Equal(now))
			Expect(c.Reason).To(Equal("Abc"))
			Expect(c.Message).To(Equal("Def"))
		})

		It("return nil if condition does not exists", func() {
			conditions := []Condition{{}}

			Expect(getCondition(conditions, "MyNotFoundCondition")).To(BeNil())
		})
	})
})

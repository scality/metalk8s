package v1alpha1

import (
	"fmt"
	"sync"
	"time"

	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var _ = Describe("ClusterConfig", func() {
	Describe("GetSetCondition", func() {
		It("can add and get a condition", func() {
			now := metav1.Now().Add(-time.Millisecond)
			c := ClusterConfig{
				ObjectMeta: metav1.ObjectMeta{Generation: 12},
			}

			c.SetCondition("MyCondition", metav1.ConditionTrue, "Foo", "Bar")

			cond := c.GetCondition("MyCondition")
			Expect(cond.Type).To(Equal("MyCondition"))
			Expect(cond.Status).To(Equal(metav1.ConditionTrue))
			Expect(cond.ObservedGeneration).To(BeEquivalentTo(12))
			Expect(cond.LastTransitionTime.Time).To(BeTemporally(">", now))
			Expect(cond.Reason).To(Equal("Foo"))
			Expect(cond.Message).To(Equal("Bar"))
		})

		It("Can access and edit simultaneous conditions in parallel", func() {
			now := metav1.Now().Add(-time.Millisecond)
			c := ClusterConfig{
				ObjectMeta: metav1.ObjectMeta{Generation: 12},
			}

			var wg sync.WaitGroup

			for i := 0; i < 20; i++ {
				wg.Add(2)
				go func(v int) {
					defer wg.Done()
					c.SetCondition(fmt.Sprintf("TestCond%d", v), metav1.ConditionTrue, "Foo", "Bar")
				}(i)
				go func(v int) {
					defer wg.Done()
					// NOTE: We do not check anything here we just want to ensure that it does not Panic
					c.GetCondition(fmt.Sprintf("TestCond%d", v))
				}(i)
			}

			wg.Wait()

			for i := 0; i < 20; i++ {
				wg.Add(1)
				go func(v int) {
					defer wg.Done()
					cond := c.GetCondition(fmt.Sprintf("TestCond%d", v))
					Expect(cond).ToNot(BeNil())
					Expect(cond.Type).To(Equal(fmt.Sprintf("TestCond%d", v)))
					Expect(cond.Status).To(Equal(metav1.ConditionTrue))
					Expect(cond.ObservedGeneration).To(BeEquivalentTo(12))
					Expect(cond.LastTransitionTime.Time).To(BeTemporally(">", now))
					Expect(cond.Reason).To(Equal("Foo"))
					Expect(cond.Message).To(Equal("Bar"))
				}(i)
			}

			wg.Wait()
		})
	})

	Describe("ReadyCondition", func() {
		It("can set Ready condition", func() {
			now := metav1.Now().Add(-time.Millisecond)
			c := ClusterConfig{
				ObjectMeta: metav1.ObjectMeta{Generation: 12},
			}

			c.SetReadyCondition(metav1.ConditionTrue, "Foo", "Bar")

			cond := c.GetCondition(readyConditionName)
			Expect(cond.Type).To(Equal(readyConditionName))
			Expect(cond.Status).To(Equal(metav1.ConditionTrue))
			Expect(cond.ObservedGeneration).To(BeEquivalentTo(12))
			Expect(cond.LastTransitionTime.Time).To(BeTemporally(">", now))
			Expect(cond.Reason).To(Equal("Foo"))
			Expect(cond.Message).To(Equal("Bar"))
		})
	})

	Describe("WPVIPConfiguredCondition", func() {
		It("can set VIP Configured condition", func() {
			now := metav1.Now().Add(-time.Millisecond)
			c := ClusterConfig{
				ObjectMeta: metav1.ObjectMeta{Generation: 12},
			}

			c.SetWPVIPConfiguredCondition(metav1.ConditionTrue, "Foo", "Bar")

			cond := c.GetCondition(wPVIPConfiguredConditionName)
			Expect(cond.Type).To(Equal(wPVIPConfiguredConditionName))
			Expect(cond.Status).To(Equal(metav1.ConditionTrue))
			Expect(cond.ObservedGeneration).To(BeEquivalentTo(12))
			Expect(cond.LastTransitionTime.Time).To(BeTemporally(">", now))
			Expect(cond.Reason).To(Equal("Foo"))
			Expect(cond.Message).To(Equal("Bar"))
		})
	})

	Describe("WPVIPReadyCondition", func() {
		It("can set VIP Ready condition", func() {
			now := metav1.Now().Add(-time.Millisecond)
			c := ClusterConfig{
				ObjectMeta: metav1.ObjectMeta{Generation: 12},
			}

			c.SetWPVIPReadyCondition(metav1.ConditionTrue, "Foo", "Bar")

			cond := c.GetCondition(wPVIPReadyConditionName)
			Expect(cond.Type).To(Equal(wPVIPReadyConditionName))
			Expect(cond.Status).To(Equal(metav1.ConditionTrue))
			Expect(cond.ObservedGeneration).To(BeEquivalentTo(12))
			Expect(cond.LastTransitionTime.Time).To(BeTemporally(">", now))
			Expect(cond.Reason).To(Equal("Foo"))
			Expect(cond.Message).To(Equal("Bar"))
		})
	})
})

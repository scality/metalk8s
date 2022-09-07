package v1alpha1

import (
	. "github.com/onsi/ginkgo"
	. "github.com/onsi/gomega"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var _ = Describe("VirtualIPPool", func() {
	Describe("GetConfigMap", func() {
		It("can get ConfigMap", func() {
			v := VirtualIPPool{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "my-vip-pool",
					Namespace: "my-ns",
				},
			}

			cm := v.GetConfigMap()

			Expect(cm.Name).To(Equal("my-vip-pool"))
			Expect(cm.Namespace).To(Equal("my-ns"))
		})
	})

	Describe("GetDaemonSet", func() {
		It("can get DaemonSet", func() {
			v := VirtualIPPool{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "my-vip-pool",
					Namespace: "my-ns",
				},
			}

			ds := v.GetDaemonSet()

			Expect(ds.Name).To(Equal("my-vip-pool"))
			Expect(ds.Namespace).To(Equal("my-ns"))
		})
	})

	Describe("GetSetCondition", func() {
		It("can add and get a condition", func() {
			now := metav1.Now()
			v := VirtualIPPool{
				ObjectMeta: metav1.ObjectMeta{Generation: 12},
			}

			v.SetCondition("MyCondition", metav1.ConditionTrue, "Foo", "Bar")

			c := v.GetCondition("MyCondition")
			Expect(c.Type).To(Equal("MyCondition"))
			Expect(c.Status).To(Equal(metav1.ConditionTrue))
			Expect(c.ObservedGeneration).To(BeEquivalentTo(12))
			Expect(c.LastTransitionTime.Time).To(BeTemporally(">", now.Time))
			Expect(c.Reason).To(Equal("Foo"))
			Expect(c.Message).To(Equal("Bar"))
		})
	})

	Describe("ConfiguredCondition", func() {
		It("can set Configured condition", func() {
			now := metav1.Now()
			v := VirtualIPPool{
				ObjectMeta: metav1.ObjectMeta{Generation: 12},
			}

			v.SetConfiguredCondition(metav1.ConditionTrue, "Foo", "Bar")

			c := v.GetCondition(configuredConditionName)
			Expect(c.Type).To(Equal(configuredConditionName))
			Expect(c.Status).To(Equal(metav1.ConditionTrue))
			Expect(c.ObservedGeneration).To(BeEquivalentTo(12))
			Expect(c.LastTransitionTime.Time).To(BeTemporally(">", now.Time))
			Expect(c.Reason).To(Equal("Foo"))
			Expect(c.Message).To(Equal("Bar"))
		})
	})

	Describe("AvailableCondition", func() {
		It("can set Available condition", func() {
			now := metav1.Now()
			v := VirtualIPPool{
				ObjectMeta: metav1.ObjectMeta{Generation: 12},
			}

			v.SetAvailableCondition(metav1.ConditionTrue, "Foo", "Bar")

			c := v.GetCondition(availableConditionName)
			Expect(c.Type).To(Equal(availableConditionName))
			Expect(c.Status).To(Equal(metav1.ConditionTrue))
			Expect(c.ObservedGeneration).To(BeEquivalentTo(12))
			Expect(c.LastTransitionTime.Time).To(BeTemporally(">", now.Time))
			Expect(c.Reason).To(Equal("Foo"))
			Expect(c.Message).To(Equal("Bar"))
		})
	})

	Describe("ReadyCondition", func() {
		It("can set and get Ready condition", func() {
			now := metav1.Now()
			v := VirtualIPPool{
				ObjectMeta: metav1.ObjectMeta{Generation: 12},
			}

			v.SetReadyCondition(metav1.ConditionTrue, "Foo", "Bar")

			c := v.GetReadyCondition()
			Expect(c.Type).To(Equal(readyConditionName))
			Expect(c.Status).To(Equal(metav1.ConditionTrue))
			Expect(c.ObservedGeneration).To(BeEquivalentTo(12))
			Expect(c.LastTransitionTime.Time).To(BeTemporally(">", now.Time))
			Expect(c.Reason).To(Equal("Foo"))
			Expect(c.Message).To(Equal("Bar"))
		})
	})
})

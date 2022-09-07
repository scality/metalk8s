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
})

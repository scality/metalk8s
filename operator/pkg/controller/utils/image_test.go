package utils_test

import (
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/scality/metalk8s/operator/pkg/controller/utils"
)

var _ = Describe("GetImageName", func() {
	It("return the upstream name of the image", func() {
		Expect(utils.GetImageName("metalk8s-keepalived")).To(
			HavePrefix("ghcr.io/scality/metalk8s/metalk8s-keepalived:"),
		)
	})

	It("do not find the image", func() {
		Expect(utils.GetImageName("invalid-image-name")).To(BeEmpty())
	})
})

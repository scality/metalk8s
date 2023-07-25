package utils_test

import (
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/scality/metalk8s/operator/pkg/controller/utils"
)

var _ = Describe("GetImageName", func() {
	// Nothing to test today, just here for coverage
	It("return the image name", func() {
		Expect(utils.GetImageName("metalk8s-keepalived")).ToNot(BeEmpty())
	})

	It("do not find the image", func() {
		Expect(utils.GetImageName("invalid-image-name")).To(BeEmpty())
	})
})

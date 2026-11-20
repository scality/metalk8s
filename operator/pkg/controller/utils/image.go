package utils

import (
	"fmt"

	"github.com/scality/metalk8s/operator/version"
)

// Nodes refer to an image by its upstream name, which the cluster registry
// serves from the ISO: the one of the images MetalK8s builds.
const repository = "ghcr.io/scality/metalk8s"

var imageVersions = map[string]string{
	"metalk8s-keepalived": version.Version,
}

// Compute the full Image name
func GetImageName(name string) string {
	if imgVer, present := imageVersions[name]; present {
		return fmt.Sprintf("%s/%s:%s", repository, name, imgVer)
	}
	return ""
}

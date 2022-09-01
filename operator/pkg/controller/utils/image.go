package utils

import (
	"fmt"

	"github.com/scality/metalk8s/operator/version"
)

// NOTE: We hardcode the default registry here for the moment
// this logic may change once the Operator will handle the registry
const registry = "metalk8s-registry-from-config.invalid"

var imageVersions = map[string]string{
	"metalk8s-keepalived": version.Version,
}

// Compute the full Image name
func GetImageName(name string) string {
	if imgVer, present := imageVersions[name]; present {
		return fmt.Sprintf(
			"%s/metalk8s-%s/%s:%s",
			registry, version.Version,
			name, imgVer,
		)
	}
	return ""
}

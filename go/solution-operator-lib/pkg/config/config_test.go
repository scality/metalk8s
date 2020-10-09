package config

import (
	"errors"
	"fmt"
	"regexp"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoadConfigurationFromFile(t *testing.T) {
	tests := map[string]struct {
		filename string
		result   *OperatorConfig
		error    string
	}{
		"valid-online": {
			filename: "online-config.yaml",
			result: &OperatorConfig{
				APIVersion: expectedAPIVersion,
				Kind:       expectedKind,
				Repositories: map[string][]Repository{
					"1.0.0": []Repository{
						Repository{
							Endpoint: "docker.io/grafana",
							Images:   []string{"grafana:6.7.4"},
						},
						Repository{
							Endpoint: "docker.io/prom",
							Images:   []string{"prometheus:v2.16.0"},
						},
						Repository{
							Endpoint: "docker.io/bitnami",
							Images:   []string{"prometheus-operator:v0.38.1"},
						},
					},
				},
			},
			error: "",
		},
		"valid-metalk8s": {
			filename: "metalk8s-config.yaml",
			result: &OperatorConfig{
				APIVersion: expectedAPIVersion,
				Kind:       expectedKind,
				Repositories: map[string][]Repository{
					"1.0.0": []Repository{
						Repository{
							Endpoint: "metalk8s-registry-from-config.invalid/my-solution-1.0.0",
							Images: []string{
								"grafana:6.7.4",
								"prometheus:v2.16.0",
								"prometheus-operator:v0.38.1",
							},
						},
					},
					"1.1.0": []Repository{
						Repository{
							Endpoint: "metalk8s-registry-from-config.invalid/my-solution-1.1.0",
							Images: []string{
								"grafana:7.2.1",
								"prometheus:v2.21.0",
								"prometheus-operator:v0.42.1",
							},
						},
					},
				},
			},
			error: "",
		},
		"invalid-no-apiversion": {
			filename: "invalid-no-apiversion.yaml",
			result:   nil,
			error:    "missing required field: apiVersion",
		},
		"invalid-wrong-apiversion": {
			filename: "invalid-wrong-apiversion.yaml",
			result:   nil,
			error: fmt.Sprintf(
				"invalid value for apiVersion: got `unknown.com/v1`, expected `%s`",
				expectedAPIVersion,
			),
		},
		"invalid-no-kind": {
			filename: "invalid-no-kind.yaml",
			result:   nil,
			error:    "missing required field: kind",
		},
		"invalid-wrong-kind": {
			filename: "invalid-wrong-kind.yaml",
			result:   nil,
			error: fmt.Sprintf(
				"invalid value for kind: got `InvalidKind`, expected `%s`",
				expectedKind,
			),
		},
		"invalid-no-repository": {
			filename: "invalid-no-repository.yaml",
			result:   nil,
			error:    "missing required field: repositories",
		},
		"invalid-bad-version": {
			filename: "invalid-bad-version.yaml",
			result:   nil,
			error:    "empty version number",
		},
		"invalid-empty-version": {
			filename: "invalid-empty-version.yaml",
			result:   nil,
			error:    "repositories missing for version 1.0.0",
		},
		"invalid-repository-bad-image": {
			filename: "invalid-repository-bad-image.yaml",
			result:   nil,
			error:    "invalid repository for version 1.0.0 at index 0: missing image name at index 0",
		},
		"invalid-repository-no-endpoint": {
			filename: "invalid-repository-no-endpoint.yaml",
			result:   nil,
			error:    "invalid repository for version 1.0.0 at index 0: missing required field: endpoint",
		},
		"error-non-existent-file": {
			filename: "error-non-existent.yaml",
			result:   nil,
			error:    "open testdata/error-non-existent.yaml: no such file or directory",
		},
		"error-bad-format": {
			filename: "error-bad-format.txt",
			result:   nil,
			error:    "operator configuration is not valid YAML",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			result, err := LoadConfigurationFromFile(
				fmt.Sprintf("testdata/%s", tc.filename),
			)

			if tc.error != "" {
				assert.Error(t, err)
				assert.Regexp(t, regexp.MustCompile(tc.error), err.Error())
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tc.result, result)
			}
		})
	}
}

type BrokenBuffer struct{}

func (b BrokenBuffer) Close() error {
	return nil
}

func (b BrokenBuffer) Read(p []byte) (n int, err error) {
	return 0, errors.New("this buffer is broken")
}

func TestLoadConfigurationOnBrokenFile(t *testing.T) {
	var someBrokenFile BrokenBuffer

	result, err := LoadConfiguration(someBrokenFile)

	assert.Nil(t, result)
	assert.Error(t, err)
	assert.Equal(
		t,
		"cannot read operator configuration: this buffer is broken",
		err.Error(),
	)
}

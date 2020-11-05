package config

import (
	"errors"
	"fmt"
	"os"
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
			error:    "invalid value for repositories: empty version number",
		},
		"invalid-empty-version": {
			filename: "invalid-empty-version.yaml",
			result:   nil,
			error:    "invalid value for repositories[1.0.0]: cannot be empty",
		},
		"invalid-repository-bad-image": {
			filename: "invalid-repository-bad-image.yaml",
			result:   nil,
			error:    "invalid value for repositories[1.0.0].0: invalid value for images.0: cannot be empty",
		},
		"invalid-repository-no-endpoint": {
			filename: "invalid-repository-no-endpoint.yaml",
			result:   nil,
			error:    "invalid value for repositories[1.0.0].0: missing required field: endpoint",
		},
		"error-bad-format": {
			filename: "error-bad-format.txt",
			result:   nil,
			error:    "yaml: unmarshal errors",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			result, err := LoadConfigurationFromFile(
				fmt.Sprintf("testdata/%s", tc.filename),
			)

			if tc.error != "" {
				assert.Error(t, err)
				// All errors in these cases should be validation errors
				assert.True(t, errors.Is(err, ErrValidation))
				assert.Contains(t, err.Error(), tc.error)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tc.result, result)
			}
		})
	}
}

func TestLoadConfigurationNonExistentFile(t *testing.T) {
	nonExistentFilePath := "non-existent.yaml"
	result, err := LoadConfigurationFromFile(nonExistentFilePath)

	assert.Nil(t, result)
	assert.Error(t, err)
	// This error is not about validation
	assert.False(t, errors.Is(err, ErrValidation))
	assert.True(t, errors.Is(err, os.ErrNotExist))
	assert.Contains(t, err.Error(), nonExistentFilePath)
}

type brokenBuffer struct{}

func (b brokenBuffer) Close() error {
	return nil
}

var errBrokenBuffer = errors.New("this buffer is broken")

func (b brokenBuffer) Read(p []byte) (n int, err error) {
	return 0, errBrokenBuffer
}

func TestLoadConfigurationOnBrokenFile(t *testing.T) {
	var someBrokenFile brokenBuffer

	result, err := LoadConfiguration(someBrokenFile)

	assert.Nil(t, result)
	assert.Error(t, err)
	// This error is not about validation
	assert.False(t, errors.Is(err, ErrValidation))
	assert.True(t, errors.Is(err, errBrokenBuffer))
	assert.Equal(
		t,
		"cannot read operator configuration: this buffer is broken",
		err.Error(),
	)
}

package config

import (
	"fmt"
	"io"
	"io/ioutil"
	"os"

	"gopkg.in/yaml.v2"
)

const expectedAPIVersion = "solutions.metalk8s.scality.com/v1alpha1"
const expectedKind = "OperatorConfig"

// OperatorConfig holds a mapping between the Solution versions and a list of
// repositories from which to retrieve component images.
type OperatorConfig struct {
	APIVersion   string                  `yaml:"apiVersion"`
	Kind         string                  `yaml:"kind"`
	Repositories map[string][]Repository `yaml:"repositories"`
}

// Repository holds an OCI repository endpoint and a list of images to
// retrieve from this endpoint.
type Repository struct {
	Endpoint string   `yaml:"endpoint"`
	Images   []string `yaml:"images"`
}

// LoadConfiguration parses and validates the operator configuration from a
// file buffer.
func LoadConfiguration(input io.Reader) (*OperatorConfig, error) {
	var config OperatorConfig

	buffer, err := ioutil.ReadAll(input)
	if err != nil {
		return nil, fmt.Errorf("cannot read operator configuration: %w", err)
	}

	if err := yaml.UnmarshalStrict(buffer, &config); err != nil {
		return nil, validationError(err)
	}

	if err := config.validate(); err != nil {
		return nil, validationError(err)
	}

	return &config, nil
}

// LoadConfigurationFromFile takes a file path, reads from the corresponding
// file and loads the configuration from it, delegating its logic to
// LoadConfiguration.
func LoadConfigurationFromFile(configFile string) (*OperatorConfig, error) {
	file, err := os.Open(configFile)
	if err != nil {
		return nil, fmt.Errorf(
			"cannot open operator configuration file: %w", err,
		)
	}
	defer file.Close()

	return LoadConfiguration(file)
}

func (config *OperatorConfig) validate() error {
	if config.APIVersion == "" {
		return &errMissingField{field: "apiVersion"}
	}
	if config.APIVersion != expectedAPIVersion {
		return &errBadConstant{
			field:         "apiVersion",
			actualValue:   config.APIVersion,
			expectedValue: expectedAPIVersion,
		}
	}

	if config.Kind == "" {
		return &errMissingField{field: "kind"}
	}
	if config.Kind != expectedKind {
		return &errBadConstant{
			field:         "kind",
			actualValue:   config.Kind,
			expectedValue: expectedKind,
		}
	}

	if len(config.Repositories) == 0 {
		return &errMissingField{field: "repositories"}
	}

	for version, repositories := range config.Repositories {
		if version == "" {
			return &errBadValue{
				field:  "repositories",
				reason: "empty version number",
			}
		}

		if len(repositories) == 0 {
			return &errBadValue{
				field:  fmt.Sprintf("repositories[%s]", version),
				reason: "cannot be empty",
			}
		}

		for idx, repo := range repositories {
			if err := repo.validate(); err != nil {
				return &errBadValue{
					field: fmt.Sprintf("repositories[%s].%d", version, idx),
					err:   err,
				}
			}
		}
	}

	return nil
}

func (repo *Repository) validate() error {
	if repo.Endpoint == "" {
		return &errMissingField{field: "endpoint"}
	}

	for idx, image := range repo.Images {
		if image == "" {
			return &errBadValue{
				field:  fmt.Sprintf("images.%d", idx),
				reason: "cannot be empty",
			}
		}
	}

	return nil
}

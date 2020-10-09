package config

import (
	"errors"
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
		return nil, fmt.Errorf("cannot read operator configuration: %v", err)
	}

	if err := yaml.UnmarshalStrict(buffer, &config); err != nil {
		return nil, fmt.Errorf("operator configuration is not valid YAML: %v", err)
	}

	if err := config.validate(); err != nil {
		return nil, err
	}

	return &config, nil
}

// LoadConfigurationFromFile takes a file path, reads from the corresponding
// file and loads the configuration from it, delegating its logic to
// LoadConfiguration.
func LoadConfigurationFromFile(configFile string) (*OperatorConfig, error) {
	file, err := os.Open(configFile)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	return LoadConfiguration(file)
}

func (config *OperatorConfig) validate() error {
	if config.APIVersion == "" {
		return errors.New("missing required field: apiVersion")
	}
	if config.APIVersion != expectedAPIVersion {
		return fmt.Errorf(
			"invalid value for apiVersion: got `%s`, expected `%s`",
			config.APIVersion, expectedAPIVersion,
		)
	}

	if config.Kind == "" {
		return errors.New("missing required field: kind")
	}
	if config.Kind != expectedKind {
		return fmt.Errorf(
			"invalid value for kind: got `%s`, expected `%s`",
			config.Kind, expectedKind,
		)
	}

	if len(config.Repositories) == 0 {
		return errors.New("missing required field: repositories")
	}

	for version, repositories := range config.Repositories {
		if version == "" {
			return errors.New("empty version number")
		}

		if len(repositories) == 0 {
			return fmt.Errorf("repositories missing for version %s", version)
		}

		for idx, repo := range repositories {
			if err := repo.validate(); err != nil {
				return fmt.Errorf(
					"invalid repository for version %s at index %d: %v",
					version, idx, err,
				)
			}
		}
	}

	return nil
}

func (repo *Repository) validate() error {
	if repo.Endpoint == "" {
		return errors.New("missing required field: endpoint")
	}

	for idx, image := range repo.Images {
		if image == "" {
			return fmt.Errorf("missing image name at index %d", idx)
		}
	}

	return nil
}

package config

import (
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"reflect"
	"strings"

	"gopkg.in/go-playground/validator.v9"
	"gopkg.in/yaml.v2"
)

type Repository struct {
	Endpoint string   `yaml:"endpoint" validate:"required"`
	Images   []string `yaml:"images" validate:"required,ne=0"`
}

type OperatorConfig struct {
	Kind         string                  `yaml:"kind" validate:"required,eq=OperatorConfig"`
	APIVersion   string                  `yaml:"apiVersion" validate:"required,eq=solutions.metalk8s.scality.com/v1alpha1"`
	Repositories map[string][]Repository `yaml:"repositories" validate:"required,ne=0"`
}

// Example of valid configuration file format:
//
// apiVersion: solutions.metalk8s.scality.com/v1alpha1
// kind: OperatorConfig
// repositories:
//   0.1.0:
//     - endpoint: metalk8s-registry-from-config.invalid/hyperdrive-0.1.0
//       images:
//         - hyperiod:0.1.0
//     - endpoint: metalk8s-registry-from-config.other/hyperdrive-0.1.0:
//       images:
//         - kafka:1.2.3
//   0.2.0:
//     - endpoint: metalk8s-registry-from-config.invalid/hyperdrive-0.2.0:
//       images:
//         - hyperiod:0.2.0
//         - kafka:1.2.3

func getErrorMessage(err validator.FieldError, prefix string) string {
	var field string
	var message string = "Configuration validation error: "

	if prefix != "" {
		field = prefix + "."
	}
	field += err.Field()

	switch err.Tag() {
	case "required":
		message += fmt.Sprintf("field '%v' is required.", field)
	case "ne":
		message += fmt.Sprintf("field '%v' can not be empty.", field)
	case "eq":
		message += fmt.Sprintf("field '%v' must be equal to '%v'.", field, err.Param())
	default:
		message += fmt.Sprintf("field '%v' with tag '%v'.", field, err.Tag())
	}

	return message
}

func (config *OperatorConfig) validate() error {
	var errorList []string
	validate := validator.New()

	// Substitute struct field name with the yaml one
	validate.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("yaml"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	err := validate.Struct(config)

	if err != nil {
		for _, e := range err.(validator.ValidationErrors) {
			errorList = append(errorList, getErrorMessage(e, ""))
		}
	}

	for version, repositories := range config.Repositories {
		for index, repository := range repositories {
			err = validate.Struct(repository)
			if err != nil {
				for _, e := range err.(validator.ValidationErrors) {
					fieldPrefix := fmt.Sprintf("repositories.\"%v\".%v", version, index)
					errorList = append(errorList, getErrorMessage(e, fieldPrefix))
				}
			}
		}
	}

	if len(errorList) > 0 {
		return errors.New(strings.Join(errorList[:], "\n"))
	}

	return nil
}

func LoadConfiguration(input io.Reader) (*OperatorConfig, error) {
	var config OperatorConfig

	buffer, err := ioutil.ReadAll(input)
	if err != nil {
		return nil, fmt.Errorf(
			"Error while loading configuration: %v",
			err,
		)
	}

	err = yaml.UnmarshalStrict(buffer, &config)
	if err != nil {
		return nil, fmt.Errorf(
			"Invalid Operator configuration format: %v",
			err,
		)
	}

	err = config.validate()
	if err != nil {
		return nil, err
	}

	return &config, nil
}

func LoadConfigurationFromFile(configFile string) (*OperatorConfig, error) {
	file, err := os.Open(configFile)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	return LoadConfiguration(file)
}

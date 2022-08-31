package virtualip

import (
	"fmt"
	"strings"

	"gopkg.in/yaml.v2"
)

type HLConfig struct {
	ApiVersion string `yaml:"apiVersion"`
	Kind       string `yaml:"kind"`

	Addresses []VIPAddress `yaml:"addresses"`
}

type VIPAddress struct {
	IP   string `yaml:"ip"`
	Node string `yaml:"node,omitempty"`
	VrId int    `yaml:"vr_id"`
}

const (
	expectedKind      = "KeepalivedConfiguration"
	currentApiVersion = "metalk8s.scality.com/v1alpha1"
)

var supportedApiVersion = []string{
	currentApiVersion,
}

// Load HLConfig from Yaml file and validate it
func (c *HLConfig) Load(content string) error {
	if err := yaml.Unmarshal([]byte(content), c); err != nil {
		return err
	}

	return c.Validate()
}

// Validate that the config is good
func (c *HLConfig) Validate() error {
	if c.Kind != expectedKind {
		return fmt.Errorf("invalid kind '%s' expected '%s'", c.Kind, expectedKind)
	}
	if !c.isSupportedApiVersion() {
		return fmt.Errorf(
			"apiVersion '%s' not supported, expected one of '%s'",
			c.ApiVersion, strings.Join(supportedApiVersion, ", "),
		)
	}

	for _, addr := range c.Addresses {
		if err := addr.Validate(); err != nil {
			return err
		}
	}

	return nil
}

// Validate that the VIPAddress is good
func (a *VIPAddress) Validate() error {
	if a.IP == "" {
		return fmt.Errorf("an 'ip' is mandatory for every 'addresses'")
	}
	if a.VrId < 1 || a.VrId > 255 {
		return fmt.Errorf("invalid 'vr_id' should be between 1 and 255, got '%d'", a.VrId)
	}
	return nil
}

// Convert the HLConfig to Yaml string
func (c *HLConfig) ToYaml() (string, error) {
	if err := c.Validate(); err != nil {
		return "", err
	}
	res, err := yaml.Marshal(c)
	return string(res), err
}

// Init default fields
func (c *HLConfig) Init() {
	c.Kind = expectedKind
	c.ApiVersion = currentApiVersion
}

// Get the currently configured Address for an IP
func (c *HLConfig) GetAddr(ip string) *VIPAddress {
	for _, addr := range c.Addresses {
		if addr.IP == ip {
			return &addr
		}
	}
	return nil
}

func (c *HLConfig) isSupportedApiVersion() bool {
	for _, apiVersion := range supportedApiVersion {
		if c.ApiVersion == apiVersion {
			return true
		}
	}
	return false
}

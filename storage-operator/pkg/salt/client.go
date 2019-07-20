package salt

import (
	"fmt"
	"os"
)

// A Salt API client.
type Client struct {
	address string // Address of the Salt API server.
}

// Create a new Salt API client.
func NewClient() *Client {
	const SALT_API_PORT int = 4507 // As defined in master-99-metalk8s.conf

	address := os.Getenv("METALK8S_SALT_MASTER_ADDRESS")
	if address == "" {
		address = "http://salt-master"
	}

	return &Client{
		address: fmt.Sprintf("%s:%d", address, SALT_API_PORT),
	}
}

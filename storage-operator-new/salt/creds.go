package salt

import "fmt"

type AuthType string

// Supported SaltAPI authentication methods.
const (
	Bearer AuthType = "Bearer"
)

// Credentials for Salt API.
type Credential struct {
	username string   // User name.
	secret   string   // User secret (token or password).
	kind     AuthType // Authentication method (can be Basic or Bearer).
}

// Create a new Salt API client.
//
// Arguments
//     username: user name
//     secret:   user token or password (interpretation depends on authType)
//     authType: authentication method
func NewCredential(username string, secret string, authType AuthType) *Credential {
	if authType != Bearer {
		panic(fmt.Sprintf("invalid authentication method: %s", authType))
	}
	return &Credential{username: username, secret: secret, kind: authType}
}

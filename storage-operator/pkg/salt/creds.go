package salt

import "fmt"

// Credentials for Salt API.
type Credential struct {
	username string // User name.
	token    string // User token.
	kind     string // Token type: Basic or Bearer.
}

// Create a new Salt API client.
//
// Arguments
//     username: user name
//     token:    user token
//     kind:     token type (must be either Basic or Bearer)
func NewCredential(username string, token string, kind string) *Credential {
	if kind != "Basic" && kind != "Bearer" {
		panic(fmt.Sprintf("invalid token type: %s", kind))
	}
	return &Credential{username: username, token: token, kind: kind}
}

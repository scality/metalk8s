package salt

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewCredential(t *testing.T) {
	tests := map[string]struct {
		username string
		secret   string
	}{
		"Bearer": {username: "baz", secret: "qux"},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			creds := NewCredential(tc.username, tc.secret, AuthType(name))

			assert.Equal(t, tc.username, creds.username)
			assert.Equal(t, tc.secret, creds.secret)
			assert.Equal(t, AuthType(name), creds.kind)
		})
	}
}

func TestNewCredentialBadMethod(t *testing.T) {
	assert.Panics(t, func() {
		NewCredential("admin", "admin", "Basic")
	})
}

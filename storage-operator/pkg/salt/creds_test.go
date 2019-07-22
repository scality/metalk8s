package salt

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewCredential(t *testing.T) {
	tests := map[string]struct {
		username string
		token    string
	}{
		"Basic":  {username: "foo", token: "bar"},
		"Bearer": {username: "baz", token: "qux"},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			creds := NewCredential(tc.username, tc.token, name)

			assert.Equal(t, tc.username, creds.username)
			assert.Equal(t, tc.token, creds.token)
			assert.Equal(t, name, creds.kind)
		})
	}
}

func TestNewCredentialBadToken(t *testing.T) {
	assert.Panics(t, func() {
		NewCredential("foo", "*****", "Secret")
	})
}

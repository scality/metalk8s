package volume

import (
	"testing"

	"github.com/scality/metalk8s/storage-operator/pkg/salt"
	"github.com/stretchr/testify/assert"
	"k8s.io/client-go/rest"
)

func TestGetAuthCredential(t *testing.T) {
	tests := map[string]struct {
		token    string
		username string
		password string
		expected *salt.Credential
	}{
		"ServiceAccount": {
			token: "foo", username: "", password: "",
			expected: salt.NewCredential("storage-operator", "foo", "Bearer"),
		},
		"BasicAuth": {
			token: "", username: "foo", password: "bar",
			expected: salt.NewCredential("foo", "Zm9vOmJhcg==", "Basic"),
		},
		"DefaultCreds": {
			token: "", username: "", password: "",
			expected: salt.NewCredential("admin", "YWRtaW46YWRtaW4=", "Basic"),
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			config := rest.Config{
				BearerToken: tc.token,
				Username:    tc.username,
				Password:    tc.password,
			}
			creds := getAuthCredential(&config)

			assert.Equal(t, tc.expected, creds)
		})
	}
}

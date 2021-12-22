package controllers

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"k8s.io/client-go/rest"

	"github.com/scality/metalk8s/storage-operator/salt"
)

func TestGetAuthCredential(t *testing.T) {
	tests := map[string]struct {
		token    string
		username string
		password string
		expected *salt.Credential
	}{
		"ServiceAccount": {
			token: "foo",
			expected: salt.NewCredential(
				"system:serviceaccount:kube-system:storage-operator",
				"foo",
				salt.Bearer,
			),
		},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			config := rest.Config{BearerToken: tc.token}
			creds := getAuthCredential(&config)

			assert.Equal(t, tc.expected, creds)
		})
	}
}

func TestGetAuthCredentialNoToken(t *testing.T) {
	config := rest.Config{Username: "admin", Password: "admin"}
	assert.Panics(t, func() {
		getAuthCredential(&config)
	})
}

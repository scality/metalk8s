package salt

import (
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewClientDefault(t *testing.T) {
	tests := map[string]struct {
		value    string
		expected string
	}{
		"default": {value: "", expected: "http://salt-master:4507"},
		"env_var": {value: "http://foo", expected: "http://foo:4507"},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			os.Setenv("METALK8S_SALT_MASTER_ADDRESS", tc.value)

			client := NewClient(nil)

			assert.Equal(t, tc.expected, client.address)
		})
	}
}

func TestNewPostRequest(t *testing.T) {
	tests := map[string]struct {
		is_auth  bool
		expected string
	}{
		"no_auth":   {is_auth: false, expected: ""},
		"with_auth": {is_auth: true, expected: "foo"},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			client := NewClient(nil)
			client.token = newToken("foo", 0)

			request, _ := client.newPostRequest("/", nil, tc.is_auth)
			token := request.Header.Get("X-Auth-Token")

			assert.Equal(t, tc.expected, token)
		})
	}
}

func TestDecodeApiResponse(t *testing.T) {
	tests := map[string]struct {
		status int
		body   io.ReadCloser
		result map[string]interface{}
		error  string
	}{
		"httpError": {
			status: 401, body: httpBody("error"),
			result: nil, error: "Salt API failed with code 401: error",
		},
		"formatError": {
			status: 200, body: httpBody("<html></html>"),
			result: nil, error: "cannot decode Salt API response",
		},
		"ok": {
			status: 200, body: httpBody(`{"return": [{"token": "foo"}]}`),
			result: map[string]interface{}{"token": "foo"}, error: "",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			response := http.Response{StatusCode: tc.status, Body: tc.body}

			result, err := decodeApiResponse(&response)

			if tc.error != "" {
				assert.Error(t, err)
				assert.Regexp(t, regexp.MustCompile(tc.error), err.Error())
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tc.result, result)
			}
		})
	}
}

func httpBody(body string) io.ReadCloser {
	return ioutil.NopCloser(strings.NewReader(body))
}

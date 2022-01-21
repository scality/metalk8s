package salt

import (
	"encoding/json"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

func TestNewClientDefault(t *testing.T) {
	tests := map[string]struct {
		value    string
		expected string
	}{
		"default": {value: "", expected: "https://salt-master:4507"},
		"env_var": {value: "https://foo:4507", expected: "https://foo:4507"},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			os.Setenv("METALK8S_SALT_MASTER_ADDRESS", tc.value)

			client, _ := NewClient(nil, []byte("<insert_your_cert_here>"))

			assert.Equal(t, tc.expected, client.address)
		})
	}
}

func TestNewClientNoCaCert(t *testing.T) {
	_, err := NewClient(nil, []byte{})
	assert.Error(t, err)
	assert.Regexp(t, regexp.MustCompile("Empty CA cert"), err.Error())
}

func TestNewRequest(t *testing.T) {
	tests := map[string]struct {
		is_auth  bool
		expected string
	}{
		"no_auth":   {is_auth: false, expected: ""},
		"with_auth": {is_auth: true, expected: "foo"},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			client, _ := NewClient(nil, []byte("<insert_your_cert_here>"))
			client.token = newToken("foo", 0)

			request, _ := client.newRequest("POST", "/", nil, tc.is_auth)
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
			status: 200, body: httpBody(`{"token": "foo"}`),
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

func TestExtractJID(t *testing.T) {
	tests := map[string]struct {
		json string
		jid  string
	}{
		"ok":            {json: `{"return": [{"jid": "foo"}]}`, jid: "foo"},
		"empty":         {json: `{}`, jid: ""},
		"missingReturn": {json: `{"jid": "foobar"}`, jid: ""},
		"invalidReturn": {json: `{"return": "foo"}`, jid: ""},
		"noResult":      {json: `{"return": []}`, jid: ""},
		"missingJID":    {json: `{"return": [{"id": "foo"}]}`, jid: ""},
		"invalidJID":    {json: `{"return": [{"id": 42}]}`, jid: ""},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			var ans map[string]interface{}
			err := json.Unmarshal([]byte(tc.json), &ans)
			require.NoError(t, err)
			jid, err := extractJID(ans)

			if tc.jid != "" {
				assert.NoError(t, err)
				assert.Equal(t, tc.jid, jid)
			} else {
				assert.Error(t, err)
			}
		})
	}
}

func TestExtractToken(t *testing.T) {
	tests := map[string]struct {
		json string
		tok  *authToken
	}{
		"ok": {
			json: `{"return": [{"token": "foobar", "expire": 3600}]}`,
			tok:  newToken("foobar", 3600),
		},
		"invalidExpire": {
			json: `{"return": [{"token": "foobar", "expire": "bar"}]}`,
			tok:  nil,
		},
		"invalidToken": {
			json: `{"return": [{"token": 42, "expire": 3600}]}`,
			tok:  nil,
		},
		"empty":         {json: `{}`, tok: nil},
		"missingReturn": {json: `{"token": "foo"}`, tok: nil},
		"invalidReturn": {json: `{"return": "foo"}`, tok: nil},
		"noResult":      {json: `{"return": []}`, tok: nil},
		"missingExpire": {json: `{"return": [{"token": "foobar"}]}`, tok: nil},
		"missingToken":  {json: `{"return": [{"expire": 3600}]}`, tok: nil},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			var ans map[string]interface{}
			err := json.Unmarshal([]byte(tc.json), &ans)
			require.NoError(t, err)
			token, err := extractToken(ans)

			if tc.tok != nil {
				assert.NoError(t, err)
				assert.Equal(t, tc.tok, token)
			} else {
				assert.Error(t, err)
			}
		})
	}
}

func TestParsePollAnswer(t *testing.T) {
	tests := map[string]struct {
		json string
		res  map[string]interface{}
		err  string
	}{
		"ok": {
			json: `{"info": [{
                       "Function": "state.sls",
                       "Result": {
                           "bootstrap": {
                               "retcode": 0,
                               "return": {"foo": "bar", "baz": "qux"}
                           }
                       }
                   }]}`,
			res: map[string]interface{}{"foo": "bar", "baz": "qux"},
			err: "",
		},
		"empty": {
			json: `{}`,
			res:  nil,
			err:  "missing 'info' key",
		},
		"invalidInfo": {
			json: `{"info": "nope"}`,
			res:  nil,
			err:  "missing 'info' key",
		},
		"emptyInfo": {
			json: `{"info": []}`,
			res:  nil,
			err:  "missing 'info' key",
		},
		"invalidInfoEntry": {
			json: `{"info": ["foo", "bar"]}`,
			res:  nil,
			err:  "invalid 'info' key",
		},
		"withErrorString": {
			json: `{"info": [{"Error": "job not found"}]}`,
			res:  nil,
			err:  "cannot get status .+ job not found",
		},
		"withErrorNotString": {
			json: `{"info": [{"Error": 42}]}`,
			res:  nil,
			err:  "cannot get status .+ 42",
		},
		"missingResult": {
			json: `{"info": [{"Function": "state.sls"}]}`,
			res:  nil,
			err:  "missing 'Result' key",
		},
		"missingFunction": {
			json: `{"info": [{"Result": {}}]}`,
			res:  nil,
			err:  "missing 'Function' key",
		},
		"jobInProgress": {
			json: `{"info": [{"Function": "state.sls", "Result": {}}]}`,
			res:  nil,
			err:  "",
		},
		"noResultForNode": {
			json: `{"info": [{"Function": "state.sls", "Result":{"master": {
                       "retcode": 0, "return": {"foo": "bar", "baz": "qux"}
                   }}}]}`,
			res: nil,
			err: "missing or invalid result for node bootstrap",
		},
		"invalidResultForNode": {
			json: `{"info": [{
                       "Function": "state.sls",
                       "Result":{"bootstrap": true}
                   }]}`,
			res: nil,
			err: "missing or invalid result for node bootstrap",
		},
		"missingRetcode": {
			json: `{"info": [{"Function": "state.sls", "Result":{"bootstrap": {
                       "return": {"foo": "bar", "baz": "qux"}
                   }}}]}`,
			res: nil,
			err: "missing or invalid retcode",
		},
		"invalidRetcode": {
			json: `{"info": [{"Function": "state.sls", "Result":{"bootstrap": {
                       "retcode": true, "return": {"foo": "bar", "baz": "qux"}
                   }}}]}`,
			res: nil,
			err: "missing or invalid retcode",
		},
		"invalidReturn": {
			json: `{"info": [{"Function": "state.sls", "Result":{"bootstrap": {
                       "retcode": 0, "return": true
                   }}}]}`,
			res: nil,
			err: "invalid return value",
		},
		"failedConcurrentState": {
			json: `{"info": [{"Function": "state.sls", "Result":{"bootstrap": {
                       "retcode": 1, "return": {}
                   }}}]}`,
			res: nil,
			err: "Salt job .+ failed to run",
		},
		"failureState": {
			json: `{"info": [{"Function": "state.sls", "Result":{"bootstrap": {
                       "retcode": 2, "return": "BOOM"
                   }}}]}`,
			res: nil,
			err: "BOOM",
		},
		"failureModule": {
			json: `{"info": [{"Function": "disk.dump", "Result":{"bootstrap": {
                       "retcode": 1, "return": "BOOM"
                   }}}]}`,
			res: nil,
			err: "BOOM",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			logger := log.Log.WithName("test")
			var ans map[string]interface{}
			err := json.Unmarshal([]byte(tc.json), &ans)
			require.NoError(t, err)
			result, err := parsePollAnswer(logger, "foo", "bootstrap", ans)

			if tc.err != "" {
				require.Error(t, err)
				assert.Regexp(t, regexp.MustCompile(tc.err), err.Error())
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tc.res, result)
			}
		})
	}
}

func TestExtractDeviceName(t *testing.T) {
	tests := map[string]struct {
		json string
		name string
	}{
		"ok": {
			json: `{"return": [{"bootstrap": {"success": true, "result": "loop0"}}]}`,
			name: "loop0",
		},
		"error": {
			json: `{"return": [{"bootstrap": {"success": false, "result": "ERROR"}}]}`,
			name: "",
		},
		"empty":          {json: `{}`, name: ""},
		"missingReturn":  {json: `{"name": "foobar"}`, name: ""},
		"invalidReturn":  {json: `{"return": "foo"}`, name: ""},
		"noResult":       {json: `{"return": []}`, name: ""},
		"missingNode":    {json: `{"return": [{"node1": "loop0"}]}`, name: ""},
		"invalidResult":  {json: `{"return": [{"bootstrap": 42}]}`, name: ""},
		"invalidSuccess": {json: `{"return": [{"bootstrap": {"success": 0, "result": ""}}]}`, name: ""},
		"invalidOutput":  {json: `{"return": [{"bootstrap": {"success": true, "result": 42}}]}`, name: ""},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			var ans map[string]interface{}
			err := json.Unmarshal([]byte(tc.json), &ans)
			require.NoError(t, err)
			name, err := extractDeviceName(ans, "bootstrap")

			if tc.name != "" {
				assert.NoError(t, err)
				assert.Equal(t, tc.name, name)
			} else {
				assert.Error(t, err)
			}
		})
	}
}

func httpBody(body string) io.ReadCloser {
	return ioutil.NopCloser(strings.NewReader(body))
}

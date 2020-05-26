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
	"github.com/stretchr/testify/require"
	"sigs.k8s.io/controller-runtime/pkg/runtime/log"
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
		ans map[string]interface{}
		jid string
	}{
		"ok": {
			ans: map[string]interface{}{"return": []interface{}{
				map[string]interface{}{"jid": "foobar"},
			}},
			jid: "foobar",
		},
		"empty": {
			ans: map[string]interface{}{},
			jid: "",
		},
		"missingReturn": {
			ans: map[string]interface{}{"jid": "foo"},
			jid: "",
		},
		"invalidReturn": {
			ans: map[string]interface{}{"return": "foo"},
			jid: "",
		},
		"noResult": {
			ans: map[string]interface{}{"return": []interface{}{}},
			jid: "",
		},
		"missingJID": {
			ans: map[string]interface{}{"return": []interface{}{
				map[string]interface{}{"id": "foo"},
			}},
			jid: "",
		},
		"invalidJID": {
			ans: map[string]interface{}{"return": []interface{}{
				map[string]interface{}{"jid": 42},
			}},
			jid: "",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			jid, err := extractJID(tc.ans)

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
		ans map[string]interface{}
		tok *authToken
	}{
		"ok": {
			ans: map[string]interface{}{"return": []interface{}{
				map[string]interface{}{"token": "foobar", "expire": 3.14},
			}},
			tok: newToken("foobar", 3.14),
		},
		"empty": {
			ans: map[string]interface{}{},
			tok: nil,
		},
		"missingReturn": {
			ans: map[string]interface{}{"jid": "foo"},
			tok: nil,
		},
		"invalidReturn": {
			ans: map[string]interface{}{"return": "foo"},
			tok: nil,
		},
		"noResult": {
			ans: map[string]interface{}{"return": []interface{}{}},
			tok: nil,
		},
		"missingExpire": {
			ans: map[string]interface{}{"return": []interface{}{
				map[string]interface{}{"token": "foo"},
			}},
			tok: nil,
		},
		"invalidExpire": {
			ans: map[string]interface{}{"return": []interface{}{
				map[string]interface{}{"token": "foo", "expire": "bar"},
			}},
			tok: nil,
		},
		"missingToken": {
			ans: map[string]interface{}{"return": []interface{}{
				map[string]interface{}{"expire": 3.14},
			}},
			tok: nil,
		},
		"invalidToken": {
			ans: map[string]interface{}{"return": []interface{}{
				map[string]interface{}{"token": 42, "expire": "bar"},
			}},
			tok: nil,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			token, err := extractToken(tc.ans)

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
		ans map[string]interface{}
		res map[string]interface{}
		err string
	}{
		"ok": {
			ans: map[string]interface{}{"info": []interface{}{
				map[string]interface{}{"Result": map[string]interface{}{
					"bootstrap": map[string]interface{}{
						"retcode": 0.0,
						"return": map[string]interface{}{
							"foo": "bar", "baz": "qux",
						},
					},
				}},
			}},
			res: map[string]interface{}{"foo": "bar", "baz": "qux"},
			err: "",
		},
		"empty": {
			ans: map[string]interface{}{},
			res: nil,
			err: "missing 'info' key",
		},
		"invalidInfo": {
			ans: map[string]interface{}{"info": "nope"},
			res: nil,
			err: "missing 'info' key",
		},
		"emptyInfo": {
			ans: map[string]interface{}{"info": []interface{}{}},
			res: nil,
			err: "missing 'info' key",
		},
		"invalidInfoEntry": {
			ans: map[string]interface{}{"info": []interface{}{"foo", "bar"}},
			res: nil,
			err: "invalid 'info' key",
		},
		"withErrorString": {
			ans: map[string]interface{}{"info": []interface{}{
				map[string]interface{}{"Error": "job not found"},
			}},
			res: nil,
			err: "cannot get status .+ job not found",
		},
		"withErrorNotString": {
			ans: map[string]interface{}{"info": []interface{}{
				map[string]interface{}{"Error": 42},
			}},
			res: nil,
			err: "cannot get status .+ 42",
		},
		"missingResult": {
			ans: map[string]interface{}{"info": []interface{}{
				map[string]interface{}{},
			}},
			res: nil,
			err: "missing 'Result' key",
		},
		"jobInProgress": {
			ans: map[string]interface{}{"info": []interface{}{
				map[string]interface{}{"Result": map[string]interface{}{}},
			}},
			res: nil,
			err: "",
		},
		"noResultForNode": {
			ans: map[string]interface{}{"info": []interface{}{
				map[string]interface{}{"Result": map[string]interface{}{
					"master": map[string]interface{}{
						"retcode": 0.0,
						"return": map[string]interface{}{
							"foo": "bar", "baz": "qux",
						},
					},
				}},
			}},
			res: nil,
			err: "missing or invalid result for node bootstrap",
		},
		"invalidResultForNode": {
			ans: map[string]interface{}{"info": []interface{}{
				map[string]interface{}{"Result": map[string]interface{}{
					"bootstrap": true,
				}},
			}},
			res: nil,
			err: "missing or invalid result for node bootstrap",
		},
		"missingRetcode": {
			ans: map[string]interface{}{"info": []interface{}{
				map[string]interface{}{"Result": map[string]interface{}{
					"bootstrap": map[string]interface{}{
						"return": map[string]interface{}{
							"foo": "bar", "baz": "qux",
						},
					},
				}},
			}},
			res: nil,
			err: "missing or invalid retcode",
		},
		"invalidRetcode": {
			ans: map[string]interface{}{"info": []interface{}{
				map[string]interface{}{"Result": map[string]interface{}{
					"bootstrap": map[string]interface{}{
						"retcode": true,
						"return": map[string]interface{}{
							"foo": "bar", "baz": "qux",
						},
					},
				}},
			}},
			res: nil,
			err: "missing or invalid retcode",
		},
		"invalidReturn": {
			ans: map[string]interface{}{"info": []interface{}{
				map[string]interface{}{"Result": map[string]interface{}{
					"bootstrap": map[string]interface{}{
						"retcode": 0.0,
						"return":  true,
					},
				}},
			}},
			res: nil,
			err: "invalid return value",
		},
		"failedconcurrent": {
			ans: map[string]interface{}{"info": []interface{}{
				map[string]interface{}{"Result": map[string]interface{}{
					"bootstrap": map[string]interface{}{
						"retcode": 1.0,
						"return":  map[string]interface{}{},
					},
				}},
			}},
			res: nil,
			err: "Salt job .+ failed to run",
		},
		"failure": {
			ans: map[string]interface{}{"info": []interface{}{
				map[string]interface{}{"Result": map[string]interface{}{
					"bootstrap": map[string]interface{}{
						"retcode": 2.0,
						"return":  "BOOM",
					},
				}},
			}},
			res: nil,
			err: "BOOM",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			logger := log.Log.WithName("test")
			result, err := parsePollAnswer(logger, "foo", "bootstrap", tc.ans)

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

func httpBody(body string) io.ReadCloser {
	return ioutil.NopCloser(strings.NewReader(body))
}

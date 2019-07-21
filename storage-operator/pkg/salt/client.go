package salt

import (
	"bytes"
	b64 "encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"time"

	"github.com/go-logr/logr"
	"github.com/pkg/errors"
	"sigs.k8s.io/controller-runtime/pkg/runtime/log"
)

// A Salt API client.
type Client struct {
	address string       // Address of the Salt API server.
	client  *http.Client // HTTP client to query Salt API.
	token   *authToken   // Salt API authentication token.
	logger  logr.Logger  // Logger for the client's requests
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
		client:  &http.Client{},
		token:   nil,
		logger:  log.Log.WithName("salt_api"),
	}
}

// Authenticate against the Salt API server.
func (self *Client) Authenticate() error {
	// Skip authentication if we already have a valid token.
	if self.token != nil && !self.token.isExpired() {
		self.logger.Info("skip authentication: reuse existing valid token")
		return nil
	}

	payload := map[string]string{
		"eauth":      "kubernetes_rbac",
		"username":   "admin",
		"token":      b64.StdEncoding.EncodeToString([]byte("admin:admin")),
		"token_type": "Basic",
	}

	self.logger.Info(
		"Auth", "username", payload["username"], "type", payload["token_type"],
	)

	output, err := self.post("/login", payload, false)
	if err != nil {
		return errors.Wrap(err, "Salt API authentication failed")
	}
	self.token = newToken(
		output["token"].(string), output["expire"].(float64),
	)

	return nil
}

// Test function, will be removed later…
func (self *Client) TestPing() (map[string]interface{}, error) {
	payload := map[string]string{
		"client": "local",
		"tgt":    "*",
		"fun":    "test.ping",
	}

	self.logger.Info("test.ping")

	ans, err := self.post("/", payload, true)
	if err != nil {
		return nil, errors.Wrap(err, "test.ping failed")
	}
	return ans, nil
}

// Send POST request to Salt API.
//
// Arguments
//     endpoint: API endpoint.
//     payload:  POST JSON payload.
//     is_auth:  Is the request authenticated?
//
// Returns
//     The decoded response body.
func (self *Client) post(
	endpoint string, payload map[string]string, is_auth bool,
) (map[string]interface{}, error) {
	var response *http.Response = nil

	// Setup the translog.
	defer func(start time.Time) {
		elapsed := int64(time.Since(start) / time.Millisecond)
		self.logRequest("POST", endpoint, response, elapsed)
	}(time.Now())

	request, err := self.newPostRequest(endpoint, payload, is_auth)
	if err != nil {
		return nil, errors.Wrap(err, "cannot create POST request")
	}

	// Send the POST request.
	response, err = self.client.Do(request)
	if err != nil {
		return nil, errors.Wrap(err, "POST failed on Salt API")
	}
	defer response.Body.Close()

	return decodeApiResponse(response)
}

// Log an HTTP request.
//
// Arguments
//     verb:     HTTP verb used for the request
//     endpoint: API endpoint.
//     response: HTTP response (if any)
//     elapsed:  response time (in ms)
func (self *Client) logRequest(
	verb string, endpoint string, response *http.Response, elapsed int64,
) {
	url := fmt.Sprintf("%s%s", self.address, endpoint)

	if response != nil {
		self.logger.Info(verb,
			"url", url, "StatusCode", response.StatusCode, "duration", elapsed,
		)
	} else {
		self.logger.Info(verb, "url", url, "duration", elapsed)
	}
}

// Create a POST request for Salt API.
//
// Arguments
//     endpoint: API endpoint.
//     payload:  POST JSON payload.
//     is_auth:  Is the request authenticated?
//
// Returns
//     The POST request.
func (self *Client) newPostRequest(
	endpoint string, payload map[string]string, is_auth bool,
) (*http.Request, error) {
	// Build target URL.
	url := fmt.Sprintf("%s%s", self.address, endpoint)

	// Encode the payload into JSON.
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, errors.Wrap(err, "cannot serialize POST body")
	}
	// Prepare the POST request.
	request, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return nil, errors.Wrap(err, "cannot prepare POST query for Salt API")
	}

	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	if is_auth {
		request.Header.Set("X-Auth-Token", self.token.value)
	}
	return request, nil
}

// Decode the POST response payload.
//
// Arguments
//     response: the POST response.
//
// Returns
//     The decoded API response.
func decodeApiResponse(response *http.Response) (map[string]interface{}, error) {
	// Check the return code before trying to decode the body.
	if response.StatusCode != 200 {
		errmsg := fmt.Sprintf(
			"Salt API failed with code %d", response.StatusCode,
		)
		// No decode: Salt API may returns HTML even when you asked for JSON…
		buf, err := ioutil.ReadAll(response.Body)
		if err == nil {
			errmsg = fmt.Sprintf("%s: %s", errmsg, string(buf))
		}
		return nil, errors.New(errmsg)
	}
	// Decode the response body.
	var result map[string]interface{}
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return nil, errors.Wrap(err, "cannot decode Salt API response")
	}
	// The real result is in a single-item list stored in the `return` field.
	return result["return"].([]interface{})[0].(map[string]interface{}), nil
}

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
	token   string       // Salt API authentication token.
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
		token:   "",
		logger:  log.Log.WithName("salt_api"),
	}
}

// Authenticate against the Salt API server.
func (self *Client) Authenticate() error {
	payload := map[string]string{
		"eauth":      "kubernetes_rbac",
		"username":   "admin",
		"token":      b64.StdEncoding.EncodeToString([]byte("admin:admin")),
		"token_type": "Basic",
	}

	self.logger.Info(
		"Auth", "username", payload["username"], "type", payload["token_type"],
	)

	output, err := self.post("/login", payload, nil)
	if err != nil {
		return errors.Wrap(err, "Salt API authentication failed")
	}
	self.token = output["token"].(string)

	return nil
}

// Test function, will be removed later…
func (self *Client) TestPing() (map[string]interface{}, error) {
	payload := map[string]string{
		"client": "local",
		"tgt":    "*",
		"fun":    "test.ping",
	}
	headers := map[string]string{
		"X-Auth-Token": self.token,
	}

	self.logger.Info("test.ping")

	ans, err := self.post("/", payload, headers)
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
//     headers:  HTTP headers to add to the POST request.
//
// Returns
//     The decoded response body.
func (self *Client) post(
	endpoint string, payload map[string]string, headers map[string]string,
) (map[string]interface{}, error) {
	var status int = 0
	// Build target URL.
	url := fmt.Sprintf("%s%s", self.address, endpoint)

	// Setup the translog.
	defer func(url string, start time.Time) {
		elapsed := int64(time.Since(start) / time.Millisecond)
		if status == 0 {
			self.logger.Info("POST", "url", url, "duration", elapsed)
		} else {
			self.logger.Info(
				"POST", "url", url, "StatusCode", status, "duration", elapsed,
			)
		}
	}(url, time.Now())

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
	// Set the HTTP headers.
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	for hdr, value := range headers {
		request.Header.Set(hdr, value)
	}
	// Send the POST request.
	response, err := self.client.Do(request)
	if err != nil {
		return nil, errors.Wrap(err, "POST failed on Salt API")
	}
	defer response.Body.Close()
	// Check the return code before trying to decode the body.
	status = response.StatusCode
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
	if err = json.NewDecoder(response.Body).Decode(&result); err != nil {
		return nil, errors.Wrap(err, "cannot decode Salt API response")
	}

	// The real result is in a single-item list stored in the `return` field.
	return result["return"].([]interface{})[0].(map[string]interface{}), nil
}

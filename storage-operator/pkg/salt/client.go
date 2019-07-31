package salt

import (
	"bytes"
	"context"
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

type AsyncJobFailed struct {
	reason string
}

func (self *AsyncJobFailed) Error() string {
	return self.reason
}

// A Salt API client.
type Client struct {
	address string       // Address of the Salt API server.
	client  *http.Client // HTTP client to query Salt API.
	creds   *Credential  // Salt API authentication credentials.
	token   *authToken   // Salt API authentication token.
	logger  logr.Logger  // Logger for the client's requests
}

// Create a new Salt API client.
func NewClient(creds *Credential) *Client {
	const SALT_API_PORT int = 4507 // As defined in master-99-metalk8s.conf

	address := os.Getenv("METALK8S_SALT_MASTER_ADDRESS")
	if address == "" {
		address = "http://salt-master"
	}

	return &Client{
		address: fmt.Sprintf("%s:%d", address, SALT_API_PORT),
		client:  &http.Client{},
		creds:   creds,
		token:   nil,
		logger:  log.Log.WithName("salt_api"),
	}
}

// Spawn a job, asynchronously, to prepare the volume on the specified node.
//
// Arguments
//     ctx:      the request context (used for cancellation)
//     nodeName: name of the node where the volume will be
//
// Returns
//     The Salt job ID.
func (self *Client) PrepareVolume(
	ctx context.Context, nodeName string,
) (string, error) {
	// Use rand_sleep to emulate slow operation for now
	payload := map[string]string{
		"client": "local_async",
		"tgt":    nodeName,
		"fun":    "test.rand_sleep",
	}

	self.logger.Info("PrepareVolume")

	ans, err := self.authenticatedRequest(ctx, "POST", "/", payload)
	if err != nil {
		return "", errors.Wrapf(
			err, "PrepareVolume failed (target=%s)", nodeName,
		)
	}
	// TODO(#1461): make this more robust.
	result := ans["return"].([]interface{})[0].(map[string]interface{})
	return result["jid"].(string), nil
}

// Poll the status of an asynchronous Salt job.
//
// Arguments
//     ctx:      the request context (used for cancellation)
//     jobId:    Salt job ID
//     nodeName: node on which the job is executed
//
// Returns
//     The result of the job if the execution is over, otherwise nil.
func (self *Client) PollJob(
	ctx context.Context, jobId string, nodeName string,
) (map[string]interface{}, error) {
	jobLogger := self.logger.WithValues("jobId", jobId)
	jobLogger.Info("polling Salt job")

	endpoint := fmt.Sprintf("/jobs/%s", jobId)
	ans, err := self.authenticatedRequest(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, errors.Wrapf(
			err, "Salt job polling failed for ID %s", jobId,
		)
	}

	// TODO(#1461): make this more robust.
	info := ans["info"].([]interface{})[0].(map[string]interface{})

	// Unknown Job ID: maybe the Salt server restarted or something like that.
	if errmsg, found := info["Error"]; found {
		jobLogger.Info("Salt job not found")
		reason := fmt.Sprintf(
			"cannot get status for job %s: %s", jobId, (errmsg).(string),
		)
		return nil, errors.New(reason)
	}
	result := info["Result"].(map[string]interface{})
	// No result yet, the job is still running.
	if len(result) == 0 {
		jobLogger.Info("Salt job is still running")
		return nil, nil
	}
	nodeResult := result[nodeName].(map[string]interface{})

	// The job is done: check if it has succeeded.
	success := result[nodeName].(map[string]interface{})["success"].(bool)
	if !success {
		jobLogger.Info("Salt job failed")
		reason := nodeResult["return"].(string)
		return nil, &AsyncJobFailed{reason}
	}
	jobLogger.Info("Salt job succeedeed")
	return nodeResult, nil
}

// Send an authenticated request to Salt API.
//
// Automatically handle:
// - missing token (authenticate)
// - token expiration (re-authenticate)
// - token invalidation (re-authenticate)
//
// Arguments
//     ctx:      the request context (used for cancellation)
//     verb:     HTTP verb used for the request
//     endpoint: API endpoint.
//     payload:  request JSON payload (optional)
//
// Returns
//     The decoded response body.
func (self *Client) authenticatedRequest(
	ctx context.Context,
	verb string,
	endpoint string,
	payload map[string]string,
) (map[string]interface{}, error) {
	// Authenticate if we don't have a valid token.
	if self.token == nil || self.token.isExpired() {
		if err := self.authenticate(ctx); err != nil {
			return nil, err
		}
	}

	response, err := self.doRequest(ctx, verb, endpoint, payload, true)
	if err != nil {
		return nil, err
	}
	// Maybe the token got invalidated by a restart of the Salt API server.
	// => Re-authenticate and retry.
	if response.StatusCode == 401 {
		self.logger.Info("valid token rejected: try to re-authenticate")

		response.Body.Close() // Terminate this request before starting another.

		self.token = nil
		if err := self.authenticate(ctx); err != nil {
			return nil, err
		}
		response, err = self.doRequest(ctx, verb, endpoint, payload, true)
	}
	defer response.Body.Close()

	return decodeApiResponse(response)
}

// Authenticate against the Salt API server.
func (self *Client) authenticate(ctx context.Context) error {
	payload := map[string]string{
		"eauth":      "kubernetes_rbac",
		"username":   self.creds.username,
		"token":      self.creds.token,
		"token_type": string(self.creds.kind),
	}

	self.logger.Info(
		"Auth", "username", payload["username"], "type", payload["token_type"],
	)

	response, err := self.doRequest(ctx, "POST", "/login", payload, false)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	result, err := decodeApiResponse(response)
	if err != nil {
		return errors.Wrapf(
			err,
			"Salt API authentication failed (username=%s, type=%s)",
			self.creds.username, string(self.creds.kind),
		)
	}

	// TODO(#1461): make this more robust.
	output := result["return"].([]interface{})[0].(map[string]interface{})
	self.token = newToken(
		output["token"].(string), output["expire"].(float64),
	)
	return nil
}

// Send a request to Salt API.
//
// Arguments
//     ctx:      the request context (used for cancellation)
//     verb:     HTTP verb used for the request
//     endpoint: API endpoint.
//     payload:  request JSON payload (optional).
//     is_auth:  Is the request authenticated?
//
// Returns
//     The request response.
func (self *Client) doRequest(
	ctx context.Context,
	verb string,
	endpoint string,
	payload map[string]string,
	is_auth bool,
) (*http.Response, error) {
	var response *http.Response = nil

	// Setup the translog.
	defer func(start time.Time) {
		elapsed := int64(time.Since(start) / time.Millisecond)
		self.logRequest(verb, endpoint, response, elapsed)
	}(time.Now())

	request, err := self.newRequest(verb, endpoint, payload, is_auth)
	if err != nil {
		return nil, errors.Wrapf(err, "cannot create %s request", verb)
	}
	request = request.WithContext(ctx)

	// Send the request.
	response, err = self.client.Do(request)
	if err != nil {
		return nil, errors.Wrapf(err, "%s failed on Salt API", verb)
	}
	return response, nil
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

// Create an HTTP request for Salt API.
//
// Arguments
//     verb:     HTTP verb used for the request
//     endpoint: API endpoint.
//     payload:  request JSON payload (optional).
//     is_auth:  Is the request authenticated?
//
// Returns
//     The HTTP request.
func (self *Client) newRequest(
	verb string, endpoint string, payload map[string]string, is_auth bool,
) (*http.Request, error) {
	// Build target URL.
	url := fmt.Sprintf("%s%s", self.address, endpoint)

	// Encode the payload into JSON.
	var body []byte = nil
	if payload != nil {
		var err error
		body, err = json.Marshal(payload)
		if err != nil {
			return nil, errors.Wrapf(err, "cannot serialize %s body", verb)
		}
	}

	// Prepare the HTTP request.
	request, err := http.NewRequest(verb, url, bytes.NewBuffer(body))
	if err != nil {
		return nil, errors.Wrapf(
			err, "cannot prepare %s query for Salt API", verb,
		)
	}

	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	if is_auth {
		request.Header.Set("X-Auth-Token", self.token.value)
	}
	return request, nil
}

// Decode the HTTP response body.
//
// Arguments
//     response: the HTTP response.
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
	return result, nil
}

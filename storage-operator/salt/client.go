package salt

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-logr/logr"
	"github.com/pkg/errors"
	"sigs.k8s.io/controller-runtime/pkg/log"
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
func NewClient(creds *Credential, caCertData []byte) (*Client, error) {
	address := os.Getenv("METALK8S_SALT_MASTER_ADDRESS")
	if address == "" {
		address = "https://salt-master:4507"
	}
	logger := log.Log.WithName("salt-api").WithValues("Salt.Address", address)

	if len(caCertData) == 0 {
		return nil, fmt.Errorf("Empty CA certificate")
	}

	certs := x509.NewCertPool()
	certs.AppendCertsFromPEM(caCertData)
	return &Client{
		address: address,
		client: &http.Client{
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{RootCAs: certs},
			},
		},
		creds:  creds,
		token:  nil,
		logger: logger,
	}, nil
}

// Spawn a job, asynchronously, to prepare the volume on the specified node.
//
// Arguments
//
//	ctx:        the request context (used for cancellation)
//	nodeName:   name of the node where the volume will be
//	volumeName: name of the volume to prepare
//	saltenv:    saltenv to use
//
// Returns
//
//	The Salt job handle.
func (self *Client) PrepareVolume(
	ctx context.Context, nodeName string, volumeName string, saltenv string,
) (*JobHandle, error) {
	const jobName string = "PrepareVolume"

	payload := map[string]interface{}{
		"client": "local_async",
		"tgt":    nodeName,
		"fun":    "state.sls",
		"kwarg": map[string]interface{}{
			"mods":    "metalk8s.volumes",
			"saltenv": saltenv,
			"pillar":  map[string]interface{}{"volume": volumeName},
		},
	}

	self.logger.Info(
		jobName, "Volume.NodeName", nodeName, "Volume.Name", volumeName,
	)

	return self.submitJob(ctx, jobName, volumeName, payload)
}

// Spawn a job, asynchronously, to unprepare the volume on the specified node.
//
// Arguments
//
//	ctx:      the request context (used for cancellation)
//	nodeName: name of the node where the volume will be
//	volumeName: name of the volume to prepare
//	saltenv:    saltenv to use
//
// Returns
//
//	The Salt job handle.
func (self *Client) UnprepareVolume(
	ctx context.Context, nodeName string, volumeName string, saltenv string,
) (*JobHandle, error) {
	const jobName string = "UnprepareVolume"

	payload := map[string]interface{}{
		"client": "local_async",
		"tgt":    nodeName,
		"fun":    "state.sls",
		"kwarg": map[string]interface{}{
			"mods":    "metalk8s.volumes.unprepared",
			"saltenv": saltenv,
			"pillar":  map[string]interface{}{"volume": volumeName},
		},
	}

	self.logger.Info(
		jobName, "Volume.NodeName", nodeName, "Volume.Name", volumeName,
	)

	return self.submitJob(ctx, jobName, volumeName, payload)
}

// Poll the status of an asynchronous Salt job.
//
// Arguments
//
//	ctx:      the request context (used for cancellation)
//	job:      Salt job handle
//	nodeName: node on which the job is executed
//
// Returns
//
//	The result of the job if the execution is over, otherwise nil.
func (self *Client) PollJob(
	ctx context.Context, job *JobHandle, nodeName string,
) (map[string]interface{}, error) {
	jobLogger := self.logger.WithValues("Salt.JobId", job.ID)
	jobLogger.Info("polling Salt job")

	endpoint := fmt.Sprintf("/jobs/%s", job.ID)
	ans, err := self.authenticatedRequest(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, errors.Wrapf(
			err, "Salt job polling failed for ID %s", job.ID,
		)
	}

	result, err := parsePollAnswer(jobLogger, job.ID, nodeName, ans)
	if err != nil {
		return nil, err
	}
	return result, nil
}

func getStateFailureRootCause(output interface{}) string {
	const non_root_error_prefix string = "One or more requisite failed"

	switch error := output.(type) {
	case string:
		return error
	case map[string]interface{}:
		for key := range error {
			status := error[key].(map[string]interface{})
			success := status["result"].(bool)
			reason := status["comment"].(string)
			if !success && !strings.HasPrefix(reason, non_root_error_prefix) {
				return reason
			}
		}
		return "state failed, root cause not found"
	default:
		return fmt.Sprintf("unknown error type (%T)", error)
	}
}

// Return the info of the specified device on the given node.
//
// This request is asynchronous.
//
// Arguments
//
//	ctx:        the request context (used for cancellation)
//	nodeName:   name of the node where the volume will be
//	volumeName: name of the volume to target
//
// Returns
//
//	The Salt job handle.
func (self *Client) GetDeviceInfo(
	ctx context.Context, nodeName string, volumeName string,
) (*JobHandle, error) {
	const jobName string = "GetDeviceInfo"

	payload := map[string]interface{}{
		"client":  "local_async",
		"tgt":     nodeName,
		"fun":     "metalk8s_volumes.device_info",
		"arg":     volumeName,
		"timeout": 1,
	}

	self.logger.Info(
		jobName, "Volume.NodeName", nodeName, "Volume.Name", volumeName,
	)

	return self.submitJob(ctx, jobName, volumeName, payload)
}

// Return the name of the block device designed by `devicePath`.
//
// This request is synchronous.
//
// Arguments
//
//	ctx:        the request context (used for cancellation)
//	nodeName:   name of the node where the device is
//	volumeName: name of the associated volume
//	devicePath: path of the device for which we want the name
//
// Returns
//
//	The Salt job handle.
func (self *Client) GetDeviceName(
	ctx context.Context, nodeName string, volumeName string, devicePath string,
) (string, error) {
	const jobName string = "GetDeviceName"
	payload := map[string]interface{}{
		"client":  "local",
		"tgt":     nodeName,
		"fun":     "metalk8s_volumes.device_name",
		"arg":     devicePath,
		"timeout": 1,
	}

	self.logger.Info(
		jobName, "Volume.NodeName", nodeName, "Volume.Name", volumeName,
	)

	ans, err := self.authenticatedRequest(ctx, "POST", "/", payload)
	if err != nil {
		return "", errors.Wrapf(
			err, "%s failed (target=%s, path=%s)", jobName, nodeName, devicePath,
		)
	}

	return extractDeviceName(ans, nodeName)
}

// Submit a Salt job and return the job handle.
func (self *Client) submitJob(
	ctx context.Context,
	jobName string,
	volumeName string,
	payload map[string]interface{},
) (*JobHandle, error) {
	ans, err := self.authenticatedRequest(ctx, "POST", "/", payload)
	if err != nil {
		return nil, errors.Wrapf(
			err,
			"%s failed for volume %s (%v)",
			jobName, volumeName, payload,
		)
	}
	if jid, err := extractJID(ans); err != nil {
		return nil, errors.Wrapf(
			err,
			"Cannot extract JID from %s response for volume %s",
			jobName, volumeName,
		)
	} else {
		return newJob(jobName, jid), nil
	}
}

// Send an authenticated request to Salt API.
//
// Automatically handle:
// - missing token (authenticate)
// - token expiration (re-authenticate)
// - token invalidation (re-authenticate)
//
// Arguments
//
//	ctx:      the request context (used for cancellation)
//	verb:     HTTP verb used for the request
//	endpoint: API endpoint.
//	payload:  request JSON payload (optional)
//
// Returns
//
//	The decoded response body.
func (self *Client) authenticatedRequest(
	ctx context.Context,
	verb string,
	endpoint string,
	payload map[string]interface{},
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
	payload := map[string]interface{}{
		"eauth":    "kubernetes_rbac",
		"username": self.creds.username,
		"token":    self.creds.secret,
	}

	self.logger.Info(
		"Auth", "username", payload["username"], "type", string(self.creds.kind),
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

	token, err := extractToken(result)
	if err != nil {
		return err
	}
	self.token = token
	return nil
}

// Send a request to Salt API.
//
// Arguments
//
//	ctx:      the request context (used for cancellation)
//	verb:     HTTP verb used for the request
//	endpoint: API endpoint.
//	payload:  request JSON payload (optional).
//	is_auth:  Is the request authenticated?
//
// Returns
//
//	The request response.
func (self *Client) doRequest(
	ctx context.Context,
	verb string,
	endpoint string,
	payload map[string]interface{},
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
//
//	verb:     HTTP verb used for the request
//	endpoint: API endpoint.
//	response: HTTP response (if any)
//	elapsed:  response time (in ms)
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
//
//	verb:     HTTP verb used for the request
//	endpoint: API endpoint.
//	payload:  request JSON payload (optional).
//	is_auth:  Is the request authenticated?
//
// Returns
//
//	The HTTP request.
func (self *Client) newRequest(
	verb string, endpoint string, payload map[string]interface{}, is_auth bool,
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

	query := request.URL.Query()
	query.Add("timeout", "1")
	request.URL.RawQuery = query.Encode()

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
//
//	response: the HTTP response.
//
// Returns
//
//	The decoded API response.
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

// Try to extract the JID from a Salt answer.
func extractJID(ans map[string]interface{}) (string, error) {
	if results, ok := ans["return"].([]interface{}); ok && len(results) > 0 {
		if result, ok := results[0].(map[string]interface{}); ok {
			if jid, ok := result["jid"].(string); ok {
				return jid, nil
			}
		}
	}
	return "", fmt.Errorf("cannot extract jid from %v", ans)
}

func extractToken(ans map[string]interface{}) (*authToken, error) {
	if results, ok := ans["return"].([]interface{}); ok && len(results) > 0 {
		if result, ok := results[0].(map[string]interface{}); ok {
			token, token_ok := result["token"].(string)
			expire, expire_ok := result["expire"].(float64)
			if token_ok && expire_ok {
				return newToken(token, expire), nil
			}
		}
	}
	return nil, fmt.Errorf("cannot extract authentication token from %v", ans)
}

func parsePollAnswer(
	logger logr.Logger,
	jobID string,
	nodeName string,
	ans map[string]interface{},
) (map[string]interface{}, error) {
	// Extract info subkey.
	info_arr, ok := ans["info"].([]interface{})
	if !ok || len(info_arr) == 0 {
		return nil, fmt.Errorf("missing 'info' key in %v", ans)
	}
	info, ok := info_arr[0].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid 'info' key in %v", ans)
	}
	// Check for "Error" field.
	if reason, found := info["Error"]; found {
		// Unknown Job ID: maybe the Salt server restarted or something like that.
		logger.Info("Salt job not found")
		return nil, fmt.Errorf("cannot get status for job %s: %v", jobID, reason)
	}
	// Extract function.
	function, ok := info["Function"].(string)
	if !ok {
		return nil, fmt.Errorf("missing 'Function' key in %v", info)
	}
	// Extract results.
	result, ok := info["Result"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("missing 'Result' key in %v", info)
	}
	// No result yet, the job is still running.
	if len(result) == 0 {
		logger.Info("Salt job is still running")
		return nil, nil
	}
	// Get result for the given node.
	nodeResult, found := result[nodeName].(map[string]interface{})
	if !found {
		return nil, fmt.Errorf(
			"missing or invalid result for node %s in %v", nodeName, result,
		)
	}
	// Inspect "retcode" and "result".
	retcode, ok := nodeResult["retcode"].(float64)
	if !ok {
		return nil, fmt.Errorf("missing or invalid retcode in %v", nodeResult)
	}
	output, found := nodeResult["return"]
	if int(retcode) == 0 { // Success
		logger.Info("Salt job succeeded")

		if returnedDict, ok := output.(map[string]interface{}); !ok {
			return nil, fmt.Errorf("invalid return value in %v", nodeResult)
		} else {
			return returnedDict, nil
		}
	} else {
		// Concurrent state execution: the job failed to run.
		if int(retcode) == 1 && function == "state.sls" {
			return nil, fmt.Errorf("Salt job %s failed to run: %v", jobID, output)
		}
		// The salt job failed.
		logger.Info("Salt job failed")
		reason := getStateFailureRootCause(output)

		return nil, &AsyncJobFailed{reason}
	}
}

// Try to extract the device name from a Salt answer.
// e.g:
// {"return": [{"bootstrap": {"result": "an error message", "success": false}}]}
// {"return": [{"bootstrap": {"result": "loop1", "success": true}}]}
func extractDeviceName(ans map[string]interface{}, nodeName string) (string, error) {
	if results, ok := ans["return"].([]interface{}); ok && len(results) > 0 {
		if nodeResults, ok := results[0].(map[string]interface{}); ok {
			if result, ok := nodeResults[nodeName].(map[string]interface{}); ok {
				// Inspect "success" and "result".
				is_success, has_success := result["success"].(bool)
				output, has_result := result["result"].(string)
				if !has_success || !has_result {
					goto invalidFormat
				}
				if is_success {
					return output, nil
				}
				return "", errors.New(output)
			}
		}
	}
invalidFormat:
	return "", fmt.Errorf(
		"cannot extract device name for %s from %v", nodeName, ans,
	)
}

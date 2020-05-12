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
	"net/url"
	"os"
	"path"
	"strings"
	"time"

	"github.com/go-logr/logr"
	"github.com/pkg/errors"

	"k8s.io/client-go/rest"
	"k8s.io/klog/klogr"
)

type AsyncJobFailed struct {
	reason string
}

func (self *AsyncJobFailed) Error() string {
	return self.reason
}

// A Salt API client.
type Client struct {
	address string            // Address of the Salt API server.
	client  *http.Client      // HTTP client to query Salt API.
	creds   *Credential       // Salt API authentication credentials.
	token   *authToken        // Salt API authentication token.
	logger  logr.Logger       // Logger for the client's requests.
	headers map[string]string // Custom headers to add to requests.
}

// Create a new Salt API client.
func NewClient(
	address string, creds *Credential, caCertData []byte, logger logr.Logger,
) (*Client, error) {
	if address == "" {
		address = os.Getenv("METALK8S_SALT_MASTER_ADDRESS")
	}
	if address == "" {
		address = "https://salt-master:4507"
	}

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

// Create a new Salt API client from a given config (basically a kubeconfig)
func NewFromConfig(config *rest.Config) (*Client, error) {
	// config.Host is the apiserver url, add path to the Salt-master proxy
	url, err := url.Parse(config.Host)
	if err != nil {
		return nil, err
	}
	url.Path = path.Join(
		url.Path,
		"api/v1/namespaces/kube-system/services/https:salt-master:api/proxy/",
	)
	address := url.String()

	// Username is mandatory for Salt-API even if it's already part of the
	// Bearer Token
	username := config.Username
	if username == "" {
		username = "salt-go-client"
	}

	if config.BearerToken == "" {
		return nil, fmt.Errorf("Salt API only support BearerToken authentication")
	}

	client, err := NewClient(
		address,
		NewCredential(username, config.BearerToken, BearerToken),
		config.TLSClientConfig.CAData,
		klogr.New().WithName("salt-api").WithValues("Salt.Address", address),
	)
	if err != nil {
		return nil, err
	}

	if client.headers == nil {
		client.headers = map[string]string{}
	}
	// Add header to authenticate through apiserver Proxy
	client.headers["Authorization"] = fmt.Sprintf(
		"Bearer %s", config.BearerToken,
	)

	return client, nil
}

// Run a Salt command using local async client
//
// Arguments
//		ctx:		the request context (used for cancellation)
//		tgt:		salt minion target
//		fun:		salt function to execute
//		kwarg:	aditional kwargs
//
// Returns
//		The Salt job ID
func (self *Client) LocalAsync(
	ctx context.Context, tgt string, fun string, kwarg map[string]interface{},
) (string, error) {
	payload := map[string]interface{}{
		"client": "local_async",
		"tgt":    tgt,
		"fun":    fun,
	}

	if len(kwarg) > 0 {
		payload["kwarg"] = kwarg
	}

	ans, err := self.authenticatedRequest(ctx, "POST", "/", payload)
	if err != nil {
		return "", err
	}

	// TODO(#1461): make this more robust
	result := ans["return"].([]interface{})[0].(map[string]interface{})
	return result["jid"].(string), nil
}

// Poll the status of an asynchronous Salt job.
//
// Arguments
//     ctx:      the request context (used for cancellation)
//     jobId:    Salt job ID
//
// Returns
//     The result of the job if the execution is over, otherwise nil.
func (self *Client) PollJob(
	ctx context.Context, jobId string,
) (map[string]interface{}, error) {
	jobLogger := self.logger.WithValues("Salt.JobId", jobId)
	jobLogger.V(3).Info("polling Salt job")

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
		jobLogger.V(3).Info("Salt job not found")
		reason := fmt.Sprintf(
			"cannot get status for job %s: %s", jobId, (errmsg).(string),
		)
		return nil, errors.New(reason)
	}
	result := info["Result"].(map[string]interface{})
	// No result yet, the job is still running.
	if len(result) == 0 {
		jobLogger.V(3).Info("Salt job is still running")
		return nil, nil
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
		self.logger.V(3).Info("valid token rejected: try to re-authenticate")

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
	}

	if self.creds.kind == BearerToken {
		payload["token"] = self.creds.token
	} else {
		payload["password"] = self.creds.token
	}

	self.logger.V(3).Info(
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
//     verb:     HTTP verb used for the request
//     endpoint: API endpoint.
//     response: HTTP response (if any)
//     elapsed:  response time (in ms)
func (self *Client) logRequest(
	verb string, endpoint string, response *http.Response, elapsed int64,
) {
	url := fmt.Sprintf("%s%s", self.address, endpoint)

	if response != nil {
		self.logger.V(3).Info(verb,
			"url", url, "StatusCode", response.StatusCode, "duration", elapsed,
		)
	} else {
		self.logger.V(3).Info(verb, "url", url, "duration", elapsed)
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

	for key, value := range self.headers {
		request.Header.Set(key, value)
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

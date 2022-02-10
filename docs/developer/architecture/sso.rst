Single Sign On
==============

Context
-------

As for now, when we log in to the MetalK8s UI and then we access to Grafana,
we have to log in again because these two components do not share a common
session and Dex (the authentication provider) does not offer such
functionality.

Requirements
------------
* Ability to share login session between UI components.
* Ability to logout once and for all UI components.
* Support for both static password and other authentication providers.

User Stories
------------
As a Platform Administrator, I want to:

- While logged in, if I click **advanced metrics** I want to access Grafana
  without logging in again
- While logged in, If I click **logout** I want to be logged out from all the
  components

Design Choices
--------------

Rejected Designs
****************

Keycloak
~~~~~~~~
Keycloak does persist a session and thus can support an SSO behavior, but using
it means maintaining a database while we want a simple authentication provider
to fallback on.

Replace Dex by oauth2-proxy
~~~~~~~~~~~~~~~~~~~~~~~~~~~
Although oauth2-proxy keeps track of sessions unlike Dex, it does not provide
OIDC functionnalities and thus cannot be used by the kube-apiserver.
Also using Oauth2-proxy as an authentication proxy for kube-apiserver is not
an option because the apiserver requires presenting a valid certificate with
the authentication headers, something Oauth2-proxy is not capable of.

Chosen Approach
***************

We will use a combination of Dex and Oauth2-proxy,

- Dex is used to provide token from static password authentication and to proxy
  other configured OIDC providers
- Oauth2-proxy is used to handle authentication and session support for the
  different endpoints

Implementations details
-----------------------

Components functionalities
**************************

Dex will:

- Provide static password authentication support
- Provide tokens backed by the static password, kube-apiserver will be
  configured to talk to Dex
- Proxy other OIDC providers like Keycloak, and other authentication protocols
  like SAML or LDAP.

Oauth2-proxy will:

- Be installed as a sidecar authentication layer for the control plane
  components (PlatformUI, Grafana, Prometheus, etc)
- Provide session support, moving from one components to another while keeping
  the same session id
- Redirect to Dex and recover the authentication token if the session does not
  exist or is not valid anymore (e.g. expired)
- Provide the token to the protected upstream via headers or in the session
  itself (some logic needed to extract the token from the session)

**Note**: An alpha feature of Oauth2-proxy will support multiple
upstreams with different paths in the same instance. Thus, we can have only
one Pod running Oauth2-proxy instead of the sidecar pattern. Design
and Implementation may change if this feature goes stable.

Authentication workflow
***********************

1. User visits endpoint-1 (e.g. PlatformUI)
2. Oauth2-proxy finds no session cookies, so it redirect the User to Dex
   in order to authenticate
3. User authenticates (with static password or through another OIDC provider)
4. Oauth2-proxy gets a token and creates a session
5. Oauth2-proxy passes the token to the upstream, User is logged in
6. User visits endpoint-2 (e.g. Grafana)
7. Oauth2-proxy reads the session, and redirect the User to the endpoint-2
   while passing the token to the upstream
8. User is automatically logged in the endpoint-2
9. User logs out, Oauth2-proxy deletes the session
10. GOTO (1)

NB: Ajax requests will receive 401 if the request does not contain the cookie.

Upstream authentication
***********************

Using Oauth2-proxy, upstreams will receive the authentication token as headers.
In case of client-side application, it should send a request to ``/userinfo``
using the cookie and then retrieve the headers from the response.

The headers contain:

- The user claim (X-Forwarded-User)
- The user groups if configured (X-Forwarded-Groups)
- The email claim (X-Forwarded-Email)
- The full OIDC access token (X-Forwarded-Access-Token)

Operating Oauth2-proxy
**********************

Oauth2-proxy serves some built-in endpoints, from which

- ``/ping`` returns 200 OK if it is working correctly which can be used in
  container healthchecks
- ``/metrics`` provides metrics in prometheus format.
- ``/userinfo`` provides user and email claims
- ``/oauth2/sign_out`` removes the session to sign out the user

Monitoring Oauth2-proxy
***********************

Oauth2-proxy exposes the following metrics:

- oauth2_proxy_requests_total: Total number of requests by HTTP status code
  (Counter)
- oauth2_proxy_response_duration_seconds: A histogram of request latencies
  (Histogram)
- oauth2_proxy_requests_in_flight: Current number of requests being served
  (Gauge)

These metrics should be used to create a Grafana dashboard to monitor the
Oauth2-proxy instances.

Alerting should be based on the status of the Pod (when readiness/liveness)
probes are correctly set up based on the ``/ping`` endpoint.

Test plans
----------
E2E test for the authentication workflow.

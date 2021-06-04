@post @local @ci @authentication
Feature: Authentication is up and running
    Scenario: List Pods
        Given the Kubernetes API is available
        Then the 'pods' list should not be empty in the 'metalk8s-auth' namespace

    Scenario: Expected Pods
        Given the Kubernetes API is available
        Then we have 2 running pod labeled 'app.kubernetes.io/name=dex' in namespace 'metalk8s-auth'

    Scenario: Reach the OpenID Config
        Given the Kubernetes API is available
        And the control-plane Ingress path '/oidc' is available
        And pods with label 'app.kubernetes.io/name=dex' are 'Ready'
        Then we can reach the OIDC openID configuration

    Scenario: Access HTTPS service
        Given the Kubernetes API is available
        And the control-plane Ingress path '/oidc' is available
        And pods with label 'app.kubernetes.io/name=dex' are 'Ready'
        When we perform a request on '/oidc/' on control-plane Ingress
        Then the server returns '404' with message '404 page not found'

    Scenario: Login to Dex using incorrect email
        Given the Kubernetes API is available
        And the control-plane Ingress path '/oidc' is available
        And pods with label 'app.kubernetes.io/name=dex' are 'Ready'
        Then we are not able to login to Dex as 'admin@metalk8s.com' using password 'password'

    Scenario: Login to Dex using correct email and password
        Given the Kubernetes API is available
        And the control-plane Ingress path '/oidc' is available
        And pods with label 'app.kubernetes.io/name=dex' are 'Ready'
        Then we are able to login to Dex as 'admin@metalk8s.invalid' using password 'password'

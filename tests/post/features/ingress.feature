@post @ci @local @ingress
Feature: Ingress
    Scenario: Access HTTP services
        Given the Kubernetes API is available
        And pods with label 'app.kubernetes.io/name=ingress-nginx' are 'Ready'
        When we perform an HTTP request on port 80 on a workload-plane IP
        Then the server returns 404 'Not Found'

    Scenario: Access HTTPS services
        Given the Kubernetes API is available
        And pods with label 'app.kubernetes.io/name=ingress-nginx' are 'Ready'
        When we perform an HTTPS request on port 443 on a workload-plane IP
        Then the server returns 404 'Not Found'

    Scenario: Access HTTP services on control-plane IP
        Given the Kubernetes API is available
        And pods with label 'app.kubernetes.io/name=ingress-nginx' are 'Ready'
        And the node control-plane IP is not equal to its workload-plane IP
        When we perform an HTTP request on port 80 on a control-plane IP
        Then the server should not respond

    Scenario: Change Control Plane Ingress IP to node-1 IP
        Given the Kubernetes API is available
        And we are on a multi node cluster
        And pods with label 'app.kubernetes.io/name=ingress-nginx' are 'Ready'
        When we update control plane ingress IP to node 'node-1' IP
        And we wait for the rollout of 'daemonset/ingress-nginx-control-plane-controller' in namespace 'metalk8s-ingress' to complete
        And we wait for the rollout of 'deploy/dex' in namespace 'metalk8s-auth' to complete
        Then the control plane ingress IP is equal to node 'node-1' IP
        And we are able to login to Dex as 'admin@metalk8s.invalid' using password 'password'

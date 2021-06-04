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

    Scenario: Failover of Control Plane Ingress VIP using MetalLB
        Given the Kubernetes API is available
        And we are on a multi node cluster
        And MetalLB is already enabled
        When we stop the node hosting the Control Plane Ingress VIP
        Then the node hosting the Control Plane Ingress VIP changed
        And we are able to login to Dex as 'admin@metalk8s.invalid' using password 'password'

    Scenario: Change Control Plane Ingress IP to node-1 IP
        Given the Kubernetes API is available
        And we are on a multi node cluster
        And MetalLB is disabled
        And pods with label 'app.kubernetes.io/name=ingress-nginx' are 'Ready'
        When we set control plane ingress IP to node 'node-1' IP
        And we wait for the rollout of 'daemonset/ingress-nginx-control-plane-controller' in namespace 'metalk8s-ingress' to complete
        And we wait for the rollout of 'deploy/dex' in namespace 'metalk8s-auth' to complete
        Then the control plane ingress IP is equal to node 'node-1' IP
        And we are able to login to Dex as 'admin@metalk8s.invalid' using password 'password'

    Scenario: Enable MetalLB
        Given the Kubernetes API is available
        And a VIP for Control Plane Ingress is available
        And MetalLB is disabled
        And pods with label 'app.kubernetes.io/name=ingress-nginx' are 'Ready'
        When we enable MetalLB and set control plane ingress IP to '{new_cp_ingress_vip}'
        And we wait for the rollout of 'deploy/metallb-controller' in namespace 'metalk8s-loadbalancing' to complete
        And we wait for the rollout of 'daemonset/metallb-speaker' in namespace 'metalk8s-loadbalancing' to complete
        And we wait for the rollout of 'deploy/ingress-nginx-control-plane-controller' in namespace 'metalk8s-ingress' to complete
        And we wait for the rollout of 'deploy/dex' in namespace 'metalk8s-auth' to complete
        Then the control plane ingress IP is equal to '{new_cp_ingress_vip}'
        And we are able to login to Dex as 'admin@metalk8s.invalid' using password 'password'

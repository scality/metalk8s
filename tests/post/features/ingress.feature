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

    Scenario: Create new Ingress object (without class)
        Given the Kubernetes API is available
        And pods with label 'app.kubernetes.io/name=ingress-nginx' are 'Ready'
        When we create a 'metalk8s-test-1' Ingress on path '/_metalk8s-test-1' on 'repositories' service on 'http' in 'kube-system' namespace
        And we perform an HTTPS request on path '/_metalk8s-test-1' on port 443 on a workload-plane IP
        Then the server returns 200 'OK'

    Scenario: Create new Ingress object (nginx class)
        Given the Kubernetes API is available
        And pods with label 'app.kubernetes.io/name=ingress-nginx' are 'Ready'
        When we create a 'metalk8s-test-2' Ingress with class 'nginx' on path '/_metalk8s-test-2' on 'repositories' service on 'http' in 'kube-system' namespace
        And we perform an HTTPS request on path '/_metalk8s-test-2' on port 443 on a workload-plane IP
        Then the server returns 200 'OK'

    Scenario: Create new Ingress object (invalid class)
        Given the Kubernetes API is available
        And pods with label 'app.kubernetes.io/name=ingress-nginx' are 'Ready'
        When we create a 'metalk8s-test-3' Ingress with class 'invalid-class' on path '/_metalk8s-test-3' on 'repositories' service on 'http' in 'kube-system' namespace
        And we perform an HTTPS request on path '/_metalk8s-test-3' on port 443 on a workload-plane IP
        Then the server returns 404 'Not Found'

    Scenario: Access HTTP services on control-plane IP
        Given the Kubernetes API is available
        And pods with label 'app.kubernetes.io/name=ingress-nginx' are 'Ready'
        And the node control-plane IP is not equal to its workload-plane IP
        When we perform an HTTP request on port 80 on a control-plane IP
        Then the server should not respond

    Scenario: Expose Workload Plane Ingress on Control Plane
        Given the Kubernetes API is available
        And the node control-plane IP is not equal to its workload-plane IP
        When we set portmap CIDRs to control-plane CIDR
        And we wait for the rollout of 'daemonset/calico-node' in namespace 'kube-system' to complete
        And we trigger a rollout restart of 'daemonset/ingress-nginx-controller' in namespace 'metalk8s-ingress'
        And we wait for the rollout of 'daemonset/ingress-nginx-controller' in namespace 'metalk8s-ingress' to complete
        Then an HTTP request on port 80 on a workload-plane IP should not return
        And an HTTP request on port 80 on a control-plane IP returns 404 'Not Found'

    @authentication
    Scenario: Failover of Control Plane Ingress VIP using MetalLB
        Given the Kubernetes API is available
        And we are on a multi node cluster
        And MetalLB is already enabled
        When we stop the node hosting the Control Plane Ingress VIP
        Then the node hosting the Control Plane Ingress VIP changed
        And we are able to login to Dex as 'admin@metalk8s.invalid' using password 'password'

    @authentication
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

    @authentication
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

    Scenario: Control Plane Ingress Controller pods spreading
        Given the Kubernetes API is available
        And we are on a multi node cluster
        # Control Plane Ingress Controller is a deployment only when MetalLB is enabled
        And MetalLB is already enabled
        Then pods with label 'app.kubernetes.io/component=controller,app.kubernetes.io/instance=ingress-nginx-control-plane,app.kubernetes.io/name=ingress-nginx' are 'Ready'
        And each pods with label 'app.kubernetes.io/component=controller,app.kubernetes.io/instance=ingress-nginx-control-plane,app.kubernetes.io/name=ingress-nginx' are on a different node

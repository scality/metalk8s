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

    Scenario: Expose Workload Plane Ingress on some VIPs
        Given the Kubernetes API is available
        And a list of VIPs for Workload Plane Ingress is available
        And pods with label 'app.kubernetes.io/name=metalk8s-operator' are 'Ready'
        When we update the ClusterConfig to add 'test-vip-1' Workload Plane pool with IPs '{wp_ingress_vips}'
        And we wait for the ClusterConfig to be 'Ready'
        And we trigger a rollout restart of 'daemonset/ingress-nginx-controller' in namespace 'metalk8s-ingress'
        And we wait for the rollout of 'daemonset/ingress-nginx-controller' in namespace 'metalk8s-ingress' to complete
        Then the '{wp_ingress_vips}' IPs are spread on nodes
        And an HTTP request on port 80 on '{wp_ingress_vips}' IPs returns 404 'Not Found'

    Scenario: Workload Plane Ingress VIPs reconfiguration
        Given the Kubernetes API is available
        And a list of VIPs for Workload Plane Ingress is available
        And pods with label 'app.kubernetes.io/name=metalk8s-operator' are 'Ready'
        And '{wp_ingress_first_pool}' Workload Plane VIPs are configured in the ClusterConfig 'test-vip-2' pool
        And the '{wp_ingress_first_pool}' IPs are spread on nodes
        When we update the ClusterConfig to add 'test-vip-2' Workload Plane pool with IPs '{wp_ingress_second_pool}'
        And we wait for the ClusterConfig to be 'Ready'
        And we trigger a rollout restart of 'daemonset/ingress-nginx-controller' in namespace 'metalk8s-ingress'
        And we wait for the rollout of 'daemonset/ingress-nginx-controller' in namespace 'metalk8s-ingress' to complete
        Then the '{wp_ingress_second_pool}' IPs are spread on nodes
        And an HTTP request on port 80 on '{wp_ingress_second_pool}' IPs returns 404 'Not Found'
        And the '{wp_ingress_first_pool}' IPs are no longer available on nodes
        And an HTTP request on port 80 on '{wp_ingress_first_pool}' IPs should not return

    Scenario: Workload Plane Ingress VIPs multiple pools
        Given the Kubernetes API is available
        And a list of VIPs for Workload Plane Ingress is available
        And pods with label 'app.kubernetes.io/name=metalk8s-operator' are 'Ready'
        And '{wp_ingress_first_pool}' Workload Plane VIPs are configured in the ClusterConfig 'test-vip-3-pool-1' pool
        And the '{wp_ingress_first_pool}' IPs are spread on nodes
        When we update the ClusterConfig to add 'test-vip-3-pool-2' Workload Plane pool with IPs '{wp_ingress_second_pool}'
        And we wait for the ClusterConfig to be 'Ready'
        And we trigger a rollout restart of 'daemonset/ingress-nginx-controller' in namespace 'metalk8s-ingress'
        And we wait for the rollout of 'daemonset/ingress-nginx-controller' in namespace 'metalk8s-ingress' to complete
        Then the '{wp_ingress_first_pool}' IPs are spread on nodes
        And an HTTP request on port 80 on '{wp_ingress_first_pool}' IPs returns 404 'Not Found'
        And the '{wp_ingress_second_pool}' IPs are spread on nodes
        And an HTTP request on port 80 on '{wp_ingress_second_pool}' IPs returns 404 'Not Found'

    Scenario: Failover of Workload Plane Ingress VIPs
        Given the Kubernetes API is available
        And we are on a multi node cluster
        And a list of VIPs for Workload Plane Ingress is available
        And pods with label 'app.kubernetes.io/name=metalk8s-operator' are 'Ready'
        And '{wp_ingress_vips}' Workload Plane VIPs are configured in the ClusterConfig 'test-vip-4' pool
        When we wait for the rollout of 'daemonset/ingress-nginx-controller' in namespace 'metalk8s-ingress' to complete
        And we stop the node 'node-1' Workload Plane Ingress
        Then the '{wp_ingress_vips}' IPs should no longer sit on the node 'node-1'
        And an HTTP request on port 80 on '{wp_ingress_vips}' IPs returns 404 'Not Found'

    @authentication
    Scenario: Failover of Control Plane Ingress VIP
        Given the Kubernetes API is available
        And we are on a multi node cluster
        And a Virtual IP is already configured for the Control Plane Ingress
        When we stop the node hosting the Control Plane Ingress VIP
        Then the node hosting the Control Plane Ingress VIP changed
        And we are able to login to Dex as 'admin@metalk8s.invalid' using password 'password'

    @authentication
    Scenario: Change Control Plane Ingress IP to node-1 IP
        Given the Kubernetes API is available
        And we are on a multi node cluster
        And the Control Plane Ingress is not exposed on a VIP
        And pods with label 'app.kubernetes.io/name=ingress-nginx' are 'Ready'
        When we update the ClusterConfig to set the Control Plane Ingress IP to node 'node-1' IP
        And we wait for the ClusterConfig to be 'Ready'
        And we wait for the rollout of 'daemonset/ingress-nginx-control-plane-controller' in namespace 'metalk8s-ingress' to complete
        And we wait for the rollout of 'deploy/dex' in namespace 'metalk8s-auth' to complete
        Then the control plane ingress IP is equal to node 'node-1' IP
        And we are able to login to Dex as 'admin@metalk8s.invalid' using password 'password'

    @authentication
    Scenario: Change Control Plane IP to a managed Virtual IP
        Given the Kubernetes API is available
        And a VIP for Control Plane Ingress is available
        And the Control Plane Ingress is not exposed on a VIP
        And pods with label 'app.kubernetes.io/name=ingress-nginx' are 'Ready'
        When we update the ClusterConfig to set the Control Plane Ingress IP to '{new_cp_ingress_vip}' managed VIP
        And we wait for the ClusterConfig to be 'Ready'
        And we wait for the rollout of 'daemonset/ingress-nginx-control-plane-controller' in namespace 'metalk8s-ingress' to complete
        And we wait for the rollout of 'deploy/dex' in namespace 'metalk8s-auth' to complete
        Then the control plane ingress IP is equal to '{new_cp_ingress_vip}'
        And we are able to login to Dex as 'admin@metalk8s.invalid' using password 'password'

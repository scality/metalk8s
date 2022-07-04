@post @ci @local @network
Feature: Network
    Scenario: All expected listening processes
        Given the Kubernetes API is available
        And we run on an untainted single node
        Then ports check succeed
        And we have only expected processes listening

    Scenario: Access using NodePort on workload-plane IP
        Given the Kubernetes API is available
        When we create a 'test-svc-1' NodePort service that expose a simple pod
        Then a request on the 'test-svc-1' NodePort on a workload-plane IP returns 200

    Scenario: Access using NodePort on control-plane IP
        Given the Kubernetes API is available
        And the node control-plane IP is not equal to its workload-plane IP
        When we create a 'test-svc-2' NodePort service that expose a simple pod
        Then a request on the 'test-svc-2' NodePort on a control-plane IP should not return

    Scenario: Expose NodePort on Control Plane
        Given the Kubernetes API is available
        And the node control-plane IP is not equal to its workload-plane IP
        When we create a 'test-svc-3' NodePort service that expose a simple pod
        And we set nodeport CIDRs to control-plane CIDR
        And we wait for the rollout of 'daemonset/kube-proxy' in namespace 'kube-system' to complete
        Then a request on the 'test-svc-3' NodePort on a control-plane IP returns 200
        And a request on the 'test-svc-3' NodePort on a workload-plane IP should not return

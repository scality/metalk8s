@install @ci @local @multinodes
Feature: Cluster expansion
    Scenario: Add one node to the cluster
        Given the Kubernetes API is available
        When we declare a new "control-plane" node on host "node1"
        Then node "node1" is registered in Kubernetes
        And node "node1" status is "NotReady"
        When we deploy the node "node1"
        Then node "node1" status is "Ready"
        And we have 1 running pod labeled 'component=kube-controller-manager' on node 'node1'
        And we have 1 running pod labeled 'component=kube-scheduler' on node 'node1'
        And we have 1 running pod labeled 'component=kube-apiserver' on node 'node1'
        And we have 1 running pod labeled 'k8s-app=calico-node' on node 'node1'
        And we have 1 running pod labeled 'k8s-app=kube-proxy' on node 'node1'
        And we have 1 running pod labeled 'component=etcd' on node 'node1'
        And node "node1" is a member of etcd cluster

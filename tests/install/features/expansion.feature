@install @ci @local @multinodes
Feature: Cluster expansion
    Background:
        Given the Kubernetes API is available

    Scenario: Add one node to the cluster
        When we declare a new "control-plane" node on host "node1"
        Then node "node1" is registered in Kubernetes
        And node "node1" status is "NotReady"
        When we deploy the node "node1"
        Then node "node1" status is "Ready"
        And we have 1 running pod labeled 'component=kube-controller-manager' in namespace 'kube-system' on node 'node1'
        And we have 1 running pod labeled 'component=kube-scheduler' in namespace 'kube-system' on node 'node1'
        And we have 1 running pod labeled 'component=kube-apiserver' in namespace 'kube-system' on node 'node1'
        And we have 1 running pod labeled 'k8s-app=calico-node' in namespace 'kube-system' on node 'node1'
        And we have 1 running pod labeled 'k8s-app=kube-proxy' in namespace 'kube-system' on node 'node1'
        And we have 1 running pod labeled 'component=etcd' in namespace 'kube-system' on node 'node1'
        And node "node1" is a member of etcd cluster

    @node2
    Scenario: Add a second node to the cluster
        When we declare a new "control-plane" node on host "node2"
        Then node "node2" is registered in Kubernetes
        And node "node2" status is "NotReady"
        When we deploy the node "node2"
        Then node "node2" status is "Ready"
        And we have 1 running pod labeled 'component=kube-controller-manager' in namespace 'kube-system' on node 'node2'
        And we have 1 running pod labeled 'component=kube-scheduler' in namespace 'kube-system' on node 'node2'
        And we have 1 running pod labeled 'component=kube-apiserver' in namespace 'kube-system' on node 'node2'
        And we have 1 running pod labeled 'k8s-app=calico-node' in namespace 'kube-system' on node 'node2'
        And we have 1 running pod labeled 'k8s-app=kube-proxy' in namespace 'kube-system' on node 'node2'
        And we have 1 running pod labeled 'component=etcd' in namespace 'kube-system' on node 'node2'
        And node "node2" is a member of etcd cluster

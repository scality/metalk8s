@install @ci @local @multinodes
Feature: Cluster expansion
    Background:
        Given the Kubernetes API is available

    Scenario: Add one node to the cluster
        When we declare a new "control-plane" node on host "node-2"
        Then node "node-2" is registered in Kubernetes
        And node "node-2" status is "NotReady"
        When we deploy the node "node-2"
        Then node "node-2" status is "Ready"
        And we have 1 running pod labeled 'component=kube-controller-manager' in namespace 'kube-system' on node 'node-2'
        And we have 1 running pod labeled 'component=kube-scheduler' in namespace 'kube-system' on node 'node-2'
        And we have 1 running pod labeled 'component=kube-apiserver' in namespace 'kube-system' on node 'node-2'
        And we have 1 running pod labeled 'k8s-app=calico-node' in namespace 'kube-system' on node 'node-2'
        And we have 1 running pod labeled 'k8s-app=kube-proxy' in namespace 'kube-system' on node 'node-2'
        And we have 1 running pod labeled 'component=etcd' in namespace 'kube-system' on node 'node-2'
        And node "node-2" is a member of etcd cluster

    @node3
    Scenario: Add a second node to the cluster
        When we declare a new "control-plane" node on host "node-3"
        Then node "node-3" is registered in Kubernetes
        And node "node-3" status is "NotReady"
        When we deploy the node "node-3"
        Then node "node-3" status is "Ready"
        And we have 1 running pod labeled 'component=kube-controller-manager' in namespace 'kube-system' on node 'node-3'
        And we have 1 running pod labeled 'component=kube-scheduler' in namespace 'kube-system' on node 'node-3'
        And we have 1 running pod labeled 'component=kube-apiserver' in namespace 'kube-system' on node 'node-3'
        And we have 1 running pod labeled 'k8s-app=calico-node' in namespace 'kube-system' on node 'node-3'
        And we have 1 running pod labeled 'k8s-app=kube-proxy' in namespace 'kube-system' on node 'node-3'
        And we have 1 running pod labeled 'component=etcd' in namespace 'kube-system' on node 'node-3'
        And node "node-3" is a member of etcd cluster

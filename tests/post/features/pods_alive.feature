@post @ci @local
Feature: Pods should be alive
    Scenario: List Pods
        Given the Kubernetes API is available
        Then the 'pods' list should not be empty in the 'kube-system' namespace

    Scenario: Expected Pods
        Given the Kubernetes API is available
        Then we have 1 running pod labeled 'component=kube-controller-manager' in namespace 'kube-system' on node 'bootstrap'
        And we have 1 running pod labeled 'component=kube-scheduler' in namespace 'kube-system' on node 'bootstrap'
        And we have 1 running pod labeled 'component=kube-apiserver' in namespace 'kube-system' on node 'bootstrap'
        And we have 1 running pod labeled 'component=etcd' in namespace 'kube-system' on node 'bootstrap'
        And we have 1 running pod labeled 'k8s-app=kube-proxy' in namespace 'kube-system' on node 'bootstrap'
        And we have 1 running pod labeled 'k8s-app=calico-node' in namespace 'kube-system' on node 'bootstrap'
        And we have 2 running pod labeled 'k8s-app=kube-dns' in namespace 'kube-system'
        And we have 1 running pod labeled 'app=salt-master' in namespace 'kube-system' on node 'bootstrap'
        And we have 1 running pod labeled 'app=repositories' in namespace 'kube-system' on node 'bootstrap'

    Scenario: Exec in Pods
        Given the Kubernetes API is available
        Then we can exec 'true' in the pod labeled 'app=salt-master' in the 'kube-system' namespace

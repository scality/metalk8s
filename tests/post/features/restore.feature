@post @ci @local @slow @restore
Feature: Restore
    Scenario: Restore the bootstrap node
        When we run the restore
        Then the Kubernetes API is available
        And we have 1 running pod labeled 'component=kube-controller-manager' in namespace 'kube-system' on node 'bootstrap'
        And we have 1 running pod labeled 'component=kube-scheduler' in namespace 'kube-system' on node 'bootstrap'
        And we have 1 running pod labeled 'component=kube-apiserver' in namespace 'kube-system' on node 'bootstrap'
        And we have 1 running pod labeled 'k8s-app=calico-node' in namespace 'kube-system' on node 'bootstrap'
        And we have 1 running pod labeled 'k8s-app=kube-proxy' in namespace 'kube-system' on node 'bootstrap'
        And we have 1 running pod labeled 'component=etcd' in namespace 'kube-system' on node 'bootstrap'
        And we have 1 running pod labeled 'app=salt-master' in namespace 'kube-system' on node 'bootstrap'
        And we have 1 running pod labeled 'app=repositories' in namespace 'kube-system' on node 'bootstrap'
        And node "bootstrap" is a member of etcd cluster
